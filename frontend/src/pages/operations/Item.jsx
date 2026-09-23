import { useEffect, useRef, useState } from 'react'
import { useBlocker, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Save } from 'lucide-react'

import ActionButton from '../../components/ActionButton'
import ConfirmationModal from '../../components/ConfirmationModal'
import LabeledInput from '../../components/LabeledInput'
import LabeledSelect from '../../components/LabeledSelect'
import LabeledSwitch from '../../components/LabeledSwitch'
import LabeledTextArea from '../../components/LabeledTextArea'
import { getSharedRequest } from '../../lib/sharedRequest'
import { createItem, getItemById, getItemFormOptions, getItemPackageItems, updateItem } from '../../lib/itemApi'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { useDelayedSkeleton } from '../../hooks/useDelayedSkeleton'

const EMPTY_ITEM = {
  id: 0,
  itemTypeCode: '',
  itemCategoryId: null,
  itemModelId: null,
  itemNr: '',
  manufacturer: '',
  regNr: '',
  machineNr: '',
  serialNr: '',
  yearModel: '',
  fuel: '',
  equipment: '',
  note: '',
  popupText: '',
  isActive: true,
  isStorageItem: false,
  isPartOfPackage: false,
  calculatePriceFromPartPrices: false,
  showInPlanning: false,
  sortNr: null,
  articleNr: '',
  platformHeightMm: null,
  platformLengthMm: null,
  weightKg: null,
  hourMeter: null,
  kmReading: null,
  basePrice: null,
  pricePerHour: null,
  pricePerDay: null,
  pricePerWeek: null,
  pricePerMonth: null,
  pricePerKm: null,
  fuelConsumptionLitresPerKm: null,
  fuelConsumptionLitresPerHour: null,
  replacementCost: null,
  nrOfItemsTotal: null,
  unavailableForReservation: false,
  unavailableReason: '',
  unavailableFrom: null,
  unavailableTo: null,
  accountNr: '',
  costCenterNr: '',
  packageItemIds: [],
  packageItems: [],
}

function cloneItem(value) {
  return JSON.parse(JSON.stringify(value))
}

function normalizePackageItemIds(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return Array.from(new Set(
    value
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0),
  )).sort((a, b) => a - b)
}

function normalizePackageItems(value) {
  if (!Array.isArray(value)) {
    return []
  }

  const normalizedById = new Map()

  value.forEach((entry) => {
    const packageItemId = Number(entry?.packageItemId)
    if (!Number.isInteger(packageItemId) || packageItemId <= 0) {
      return
    }

    const rawQuantity = Number(entry?.quantity)
    const quantity = Number.isFinite(rawQuantity) && rawQuantity > 0 ? rawQuantity : 1
    const roundedQuantity = Math.round(quantity * 100000) / 100000

    normalizedById.set(packageItemId, {
      packageItemId,
      quantity: roundedQuantity,
    })
  })

  return Array.from(normalizedById.values()).sort((a, b) => a.packageItemId - b.packageItemId)
}

function sameNumberArray(left, right) {
  if (left.length !== right.length) {
    return false
  }

  return left.every((value, index) => value === right[index])
}

function normalizeItemForComparison(value) {
  if (!value) {
    return value
  }

  const normalizedPackageItems = normalizePackageItems(value.packageItems)
  const normalizedPackageItemIdsFromItems = normalizedPackageItems.map((entry) => entry.packageItemId)
  const normalizedPackageItemIds = normalizedPackageItemIdsFromItems.length > 0
    ? normalizedPackageItemIdsFromItems
    : normalizePackageItemIds(value.packageItemIds)

  return {
    ...value,
    packageItemIds: normalizedPackageItemIds,
    packageItems: normalizedPackageItems,
  }
}

function formatDateTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleString('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateInput(value) {
  if (!value) {
    return ''
  }

  return `${value}`.slice(0, 10)
}

function getItemTypeCode(itemTypeCode) {
  return (itemTypeCode ?? '').toUpperCase().trim()
}

function isAluItemTypeCode(itemTypeCode) {
  return getItemTypeCode(itemTypeCode) === 'ALU'
}

function formatPackageItemLabel(packageItem) {
  const itemNr = packageItem.itemNr?.trim() || `#${packageItem.id}`
  const manufacturer = packageItem.manufacturer?.trim()
  const serialNr = packageItem.serialNr?.trim()

  return [itemNr, manufacturer, serialNr].filter(Boolean).join(' | ')
}

function renderEmptyTemplateFields(itemTypeCode) {
  const code = getItemTypeCode(itemTypeCode)
  const label = code ? `objekttypen ${code}` : 'vald objekttyp'

  return (
    <div className="rounded-sm border border-gray-200 bg-white px-4 py-4 text-xs text-gray-600">
      Inga specifika fält finns definierade för {label} ännu.
    </div>
  )
}

function renderVehicleTemplateFields(item, handleChange, handleSelectChange, handleDateChange, formOptions) {
  return (
    <div className="w-full">
      <div className="grid gap-15 md:grid-cols-2 xl:grid-cols-[minmax(0,450px)_minmax(0,220px)_minmax(0,400px)] overflow-auto">

        <span>
          <LabeledInput
            name="itemNr"
            label="Namn"
            value={item.itemNr ?? ''}
            onChange={(value) => handleChange('itemNr', value)}
            labelWidth="w-22"
            margintop="0"
          />
          <LabeledSelect
            name="itemCategoryId"
            label="Kategori"
            value={item.itemCategoryId ?? ''}
            items={formOptions.itemCategoryOptions}
            placeholder="Välj kategori"
            onChange={(value) => handleSelectChange('itemCategoryId', value)}
            labelWidth="w-22"
            margintop="0"
          />
          <LabeledSelect
            name="itemModelId"
            label="Modell"
            value={item.itemModelId ?? ''}
            items={formOptions.itemModelOptions}
            placeholder="Välj modell"
            onChange={(value) => handleSelectChange('itemModelId', value)}
            labelWidth="w-22"
            margintop="0"
          />
          <LabeledInput
            name="manufacturer"
            label="Fabrikat"
            value={item.manufacturer ?? ''}
            onChange={(value) => handleChange('manufacturer', value)}
            labelWidth="w-22"
            margintop="0"
          />
          <LabeledInput
            name="regNr"
            label="Regnr"
            value={item.regNr ?? ''}
            onChange={(value) => handleChange('regNr', value)}
            labelWidth="w-22"
            inputWidth="w-32"
            margintop="2"
          />
          <LabeledInput
            name="yearModel"
            label="Årsmodell"
            value={item.yearModel ?? ''}
            onChange={(value) => handleChange('yearModel', value)}
            labelWidth="w-22"
            inputWidth="w-32"
            margintop="0"
          />
          <LabeledInput
            name="fuel"
            label="Drivmedel"
            value={item.fuel ?? ''}
            onChange={(value) => handleChange('fuel', value)}
            labelWidth="w-22"
            inputWidth="w-32"
            margintop="0"
          />
          <LabeledInput
            name="equipment"
            label="Utrustning"
            value={item.equipment ?? ''}
            onChange={(value) => handleChange('equipment', value)}
            labelWidth="w-22"
            margintop="0"
          />
          <LabeledSwitch
            name="showInPlanning"
            label="Visa i planering"
            value={Boolean(item.showInPlanning)}
            onChange={(checked) => handleChange('showInPlanning', checked)}
            labelWidth="w-22"
            marginTop="0"
          />
          <LabeledSwitch
            name="isActive"
            label="Aktiv"
            value={Boolean(item.isActive)}
            onChange={(checked) => handleChange('isActive', checked)}
            labelWidth="w-22"
            marginTop="10"
          />

        </span>

        <span>
          <LabeledInput
            name="articleNr"
            label="Artikelnr"
            value={item.articleNr ?? ''}
            onChange={(value) => handleChange('articleNr', value)}
            labelWidth="w-22"
            margintop="0"
          />
          <LabeledInput
            name="sortNr"
            label="Sortnr"
            type="number"
            integerOnly
            value={item.sortNr}
            onChange={(value) => handleChange('sortNr', value)}
            labelWidth="w-22"
            margintop="0"
          />
          <LabeledInput
            name="fuelConsumptionLitresPerKm"
            label="Förbr. liter/km"
            type="number"
            value={item.fuelConsumptionLitresPerKm}
            onChange={(value) => handleChange('fuelConsumptionLitresPerKm', value)}
            labelWidth="w-22"
            margintop="2"
            suffix="liter"
          />
          <LabeledInput
            name="accountNr"
            label="Konto"
            value={item.accountNr ?? ''}
            onChange={(value) => handleChange('accountNr', value)}
            labelWidth="w-22"
            margintop="2"
          />
          <LabeledInput
            name="costCenterNr"
            label="Kostn.ställe"
            value={item.costCenterNr ?? ''}
            onChange={(value) => handleChange('costCenterNr', value)}
            labelWidth="w-22"
            margintop="0"
          />

        </span>

        <span className="pl-10">
          <LabeledTextArea
            name="note"
            label="Notering"
            labelPosition='top'
            value={item.note ?? ''}
            onChange={(value) => handleChange('note', value)}
            labelWidth="w-22"
            margintop="0"
            height="h-[75px]"
          />
          <LabeledTextArea
            name="popupText"
            label="Popuptext"
            labelPosition='top'
            value={item.popupText ?? ''}
            onChange={(value) => handleChange('popupText', value)}
            labelWidth="w-22"
            margintop="2"
            height="h-[75px]"
          />
          <div className="flex flex-row items-center space-x-2 mt-3">
            <LabeledSwitch
              name="unavailableForReservation"
              label="Ej bokningsbar"
              value={Boolean(item.unavailableForReservation)}
              onChange={(checked) => handleChange('unavailableForReservation', checked)}
              labelWidth="w-22"
            />
            <LabeledInput
              name="unavailableFrom"
              label="Peroid"
              type="date"
              value={formatDateInput(item.unavailableFrom)}
              onChange={(value) => handleDateChange('unavailableFrom', value)}
              margintop="0"
              inputWidth="w-18"
            />
            <LabeledInput
              name="unavailableTo"
              label=""
              type="date"
              value={formatDateInput(item.unavailableTo)}
              onChange={(value) => handleDateChange('unavailableTo', value)}
              margintop="0"
              inputWidth="w-18"
            />
          </div>
          <LabeledTextArea
            name="unavailableReason"
            label=""
            value={item.unavailableReason ?? ''}
            onChange={(value) => handleChange('unavailableReason', value)}
            labelWidth=""
            margintop="0"
            height="h-[40px]"
          />

        </span>



      </div>

    </div>
  )
}

function renderLiftTemplateFields(item, handleChange, handleSelectChange, handleDateChange, formOptions) {
  return (
    <div className="w-full">
      <div className="grid gap-15 md:grid-cols-2 xl:grid-cols-[minmax(0,450px)_minmax(0,220px)_minmax(0,400px)] overflow-auto">

        <span>
          <LabeledInput
            name="itemNr"
            label="Namn"
            value={item.itemNr ?? ''}
            onChange={(value) => handleChange('itemNr', value)}
            labelWidth="w-22"
            margintop="0"
          />
          <LabeledSelect
            name="itemCategoryId"
            label="Kategori"
            value={item.itemCategoryId ?? ''}
            items={formOptions.itemCategoryOptions}
            placeholder="Välj kategori"
            onChange={(value) => handleSelectChange('itemCategoryId', value)}
            labelWidth="w-22"
            margintop="0"
          />
          <LabeledSelect
            name="itemModelId"
            label="Modell"
            value={item.itemModelId ?? ''}
            items={formOptions.itemModelOptions}
            placeholder="Välj modell"
            onChange={(value) => handleSelectChange('itemModelId', value)}
            labelWidth="w-22"
            margintop="0"
          />
          <LabeledInput
            name="manufacturer"
            label="Fabrikat"
            value={item.manufacturer ?? ''}
            onChange={(value) => handleChange('manufacturer', value)}
            labelWidth="w-22"
            margintop="0"
          />
          <LabeledInput
            name="machineNr"
            label="Maskinnr"
            value={item.machineNr ?? ''}
            onChange={(value) => handleChange('machineNr', value)}
            labelWidth="w-22"
            inputWidth="w-32"
            margintop="2"
          />
          <LabeledInput
            name="serialNr"
            label="Serienr"
            value={item.serialNr ?? ''}
            onChange={(value) => handleChange('serialNr', value)}
            labelWidth="w-22"
            inputWidth="w-32"
            margintop="0"
          />
          <LabeledInput
            name="regNr"
            label="Regnr"
            value={item.regNr ?? ''}
            onChange={(value) => handleChange('regNr', value)}
            labelWidth="w-22"
            inputWidth="w-32"
            margintop="0"
          />
          <LabeledInput
            name="yearModel"
            label="Årsmodell"
            value={item.yearModel ?? ''}
            onChange={(value) => handleChange('yearModel', value)}
            labelWidth="w-22"
            inputWidth="w-32"
            margintop="0"
          />
          <LabeledInput
            name="weightKg"
            label="Vikt"
            type="number"
            value={item.weightKg}
            onChange={(value) => handleChange('weightKg', value)}
            labelWidth="w-22"
            inputWidth="w-32"
            margintop="0"
            suffix='kg'
          />
          <LabeledSwitch
            name="showInPlanning"
            label="Visa i planering"
            value={Boolean(item.showInPlanning)}
            onChange={(checked) => handleChange('showInPlanning', checked)}
            labelWidth="w-22"
            marginTop="0"
          />
          <LabeledSwitch
            name="isActive"
            label="Aktiv"
            value={Boolean(item.isActive)}
            onChange={(checked) => handleChange('isActive', checked)}
            labelWidth="w-22"
            marginTop="10"
          />

        </span>

        <span>
          <LabeledInput
            name="articleNr"
            label="Artikelnr"
            value={item.articleNr ?? ''}
            onChange={(value) => handleChange('articleNr', value)}
            labelWidth="w-22"
            margintop="0"
          />
          <LabeledInput
            name="sortNr"
            label="Sortnr"
            type="number"
            integerOnly
            value={item.sortNr}
            onChange={(value) => handleChange('sortNr', value)}
            labelWidth="w-22"
            margintop="0"
          />
          <LabeledInput
            name="basePrice"
            label="Grundpris"
            type="number"
            value={item.basePrice}
            onChange={(value) => handleChange('basePrice', value)}
            labelWidth="w-22"
            margintop="2"
            suffix="kr"
          />
          <LabeledInput
            name="pricePerDay"
            label="Pris/dag"
            type="number"
            value={item.pricePerDay}
            onChange={(value) => handleChange('pricePerDay', value)}
            labelWidth="w-22"
            margintop="0"
            suffix="kr"
          />
          <LabeledInput
            name="pricePerWeek"
            label="Pris/vecka"
            type="number"
            value={item.pricePerWeek}
            onChange={(value) => handleChange('pricePerWeek', value)}
            labelWidth="w-22"
            margintop="0"
            suffix="kr"
          />
          <LabeledInput
            name="pricePerMonth"
            label="Pris/månad"
            type="number"
            value={item.pricePerMonth}
            onChange={(value) => handleChange('pricePerMonth', value)}
            labelWidth="w-22"
            margintop="0"
            suffix="kr"
          />
          <LabeledInput
            name="pricePerKm"
            label="Pris/km"
            type="number"
            value={item.pricePerKm}
            onChange={(value) => handleChange('pricePerKm', value)}
            labelWidth="w-22"
            margintop="0"
            suffix="kr"
          />
          <LabeledInput
            name="pricePerHour"
            label="Pris/timme"
            type="number"
            value={item.pricePerHour}
            onChange={(value) => handleChange('pricePerHour', value)}
            labelWidth="w-22"
            margintop="0"
            suffix="kr"
          />
          <LabeledInput
            name="replacementCost"
            label="Ersättn.kost."
            type="number"
            value={item.replacementCost}
            onChange={(value) => handleChange('replacementCost', value)}
            labelWidth="w-22"
            margintop="0"
            suffix="kr"
          />
          <LabeledInput
            name="fuelConsumptionLitresPerKm"
            label="Förbr. liter/km"
            type="number"
            value={item.fuelConsumptionLitresPerKm}
            onChange={(value) => handleChange('fuelConsumptionLitresPerKm', value)}
            labelWidth="w-22"
            margintop="2"
            suffix="liter"
          />
          <LabeledInput
            name="fuelConsumptionLitresPerHour"
            label="Förbr. liter/tim"
            type="number"
            value={item.fuelConsumptionLitresPerHour}
            onChange={(value) => handleChange('fuelConsumptionLitresPerHour', value)}
            labelWidth="w-22"
            margintop="0"
            suffix="liter"
          />
          <LabeledInput
            name="accountNr"
            label="Konto"
            value={item.accountNr ?? ''}
            onChange={(value) => handleChange('accountNr', value)}
            labelWidth="w-22"
            margintop="2"
          />
          <LabeledInput
            name="costCenterNr"
            label="Kostn.ställe"
            value={item.costCenterNr ?? ''}
            onChange={(value) => handleChange('costCenterNr', value)}
            labelWidth="w-22"
            margintop="0"
          />

        </span>

        <span className="pl-10">
          <LabeledTextArea
            name="note"
            label="Notering"
            labelPosition='top'
            value={item.note ?? ''}
            onChange={(value) => handleChange('note', value)}
            labelWidth="w-22"
            margintop="0"
            height="h-[75px]"
          />
          <LabeledTextArea
            name="popupText"
            label="Popuptext"
            labelPosition='top'
            value={item.popupText ?? ''}
            onChange={(value) => handleChange('popupText', value)}
            labelWidth="w-22"
            margintop="2"
            height="h-[75px]"
          />
          <div className="flex flex-row items-center space-x-2 mt-3">
            <LabeledSwitch
              name="unavailableForReservation"
              label="Ej bokningsbar"
              value={Boolean(item.unavailableForReservation)}
              onChange={(checked) => handleChange('unavailableForReservation', checked)}
              labelWidth="w-22"
            />
            <LabeledInput
              name="unavailableFrom"
              label="Peroid"
              type="date"
              value={formatDateInput(item.unavailableFrom)}
              onChange={(value) => handleDateChange('unavailableFrom', value)}
              margintop="0"
              inputWidth="w-18"
            />
            <LabeledInput
              name="unavailableTo"
              label=""
              type="date"
              value={formatDateInput(item.unavailableTo)}
              onChange={(value) => handleDateChange('unavailableTo', value)}
              margintop="0"
              inputWidth="w-18"
            />
          </div>
          <LabeledTextArea
            name="unavailableReason"
            label=""
            value={item.unavailableReason ?? ''}
            onChange={(value) => handleChange('unavailableReason', value)}
            labelWidth=""
            margintop="0"
            height="h-[40px]"
          />

        </span>



      </div>

      <div className="mt-5 w-50">
        <LabeledInput
          name="hourMeter"
          label="Timmätare"
          type="number"
          value={item.hourMeter}
          onChange={(value) => handleChange('hourMeter', value)}
          labelWidth="w-22"
          margintop="0"
          suffix="h"
        />
        <LabeledInput
          name="kmReading"
          label="Km-mätare"
          type="number"
          integerOnly
          value={item.kmReading}
          onChange={(value) => handleChange('kmReading', value)}
          labelWidth="w-22"
          margintop="0"
          suffix="km"
        />
      </div>
    </div>
  )
}

function renderAluTemplateFields(
  item,
  handleChange,
  handleSelectChange,
  formOptions,
  packageItems,
  selectedAvailablePackageItemIds,
  selectedConnectedPackageItemIds,
  handleAvailablePackageSelection,
  handleConnectedPackageSelection,
  handleConnectedPackageQuantityChange,
  movePackageItemsToConnected,
  movePackageItemsToAvailable,
) {
  const canShowPackageLists = !item.isPartOfPackage

  return (
    <div className="w-full">
      <div className="grid gap-15 md:grid-cols-2 xl:grid-cols-[minmax(0,450px)_minmax(0,220px)_minmax(0,400px)] overflow-auto">

        <span>
          <LabeledInput
            name="itemNr"
            label="Namn"
            value={item.itemNr ?? ''}
            onChange={(value) => handleChange('itemNr', value)}
            labelWidth="w-22"
            margintop="0"
          />
          <LabeledSelect
            name="itemCategoryId"
            label="Kategori"
            value={item.itemCategoryId ?? ''}
            items={formOptions.itemCategoryOptions}
            placeholder="Välj kategori"
            onChange={(value) => handleSelectChange('itemCategoryId', value)}
            labelWidth="w-22"
            margintop="0"
          />
          <LabeledInput
            name="manufacturer"
            label="Fabrikat"
            value={item.manufacturer ?? ''}
            onChange={(value) => handleChange('manufacturer', value)}
            labelWidth="w-22"
            margintop="0"
          />
          <LabeledInput
            name="serialNr"
            label="Serienr"
            value={item.serialNr ?? ''}
            onChange={(value) => handleChange('serialNr', value)}
            labelWidth="w-22"
            inputWidth="w-32"
            margintop="2"
          />
          <LabeledInput
            name="weightKg"
            label="Vikt"
            type="number"
            value={item.weightKg}
            onChange={(value) => handleChange('weightKg', value)}
            labelWidth="w-22"
            inputWidth="w-32"
            margintop="0"
            suffix='kg'
          />
          <LabeledInput
            name="platformHeightMm"
            label="Plattformhöjd"
            type="number"
            integerOnly
            value={item.platformHeightMm}
            onChange={(value) => handleChange('platformHeightMm', value)}
            labelWidth="w-22"
            inputWidth="w-32"
            margintop="0"
            suffix="mm"
          />
          <LabeledInput
            name="platformLengthMm"
            label="Plattformlängd"
            type="number"
            integerOnly
            value={item.platformLengthMm}
            onChange={(value) => handleChange('platformLengthMm', value)}
            labelWidth="w-22"
            inputWidth="w-32"
            margintop="0"
            suffix="mm"
          />
          <LabeledSwitch
            name="isStorageItem"
            label="Lagerartikel"
            value={Boolean(item.isStorageItem)}
            onChange={(checked) => handleChange('isStorageItem', checked)}
            labelWidth="w-22"
            marginTop="2"
          />
          <LabeledSwitch
            name="isPartOfPackage"
            label="Ingår i paket"
            value={Boolean(item.isPartOfPackage)}
            onChange={(checked) => handleChange('isPartOfPackage', checked)}
            labelWidth="w-22"
            marginTop="2"
          />
          {!item.isPartOfPackage && (
            <LabeledSwitch
              name="calculatePriceFromPartPrices"
              label="Beräkna pris från delar"
              value={Boolean(item.calculatePriceFromPartPrices)}
              onChange={(checked) => handleChange('calculatePriceFromPartPrices', checked)}
              labelWidth="w-22"
              marginTop="2"
            />
          )}
          <LabeledSwitch
            name="showInPlanning"
            label="Visa i planering"
            value={Boolean(item.showInPlanning)}
            onChange={(checked) => handleChange('showInPlanning', checked)}
            labelWidth="w-22"
            marginTop=""
          />
          <LabeledSwitch
            name="isActive"
            label="Aktiv"
            value={Boolean(item.isActive)}
            onChange={(checked) => handleChange('isActive', checked)}
            labelWidth="w-22"
            marginTop="10"
          />

        </span>

        <span>
          <LabeledInput
            name="articleNr"
            label="Artikelnr"
            value={item.articleNr ?? ''}
            onChange={(value) => handleChange('articleNr', value)}
            labelWidth="w-22"
            margintop="0"
          />
          <LabeledInput
            name="sortNr"
            label="Sortnr"
            type="number"
            integerOnly
            value={item.sortNr}
            onChange={(value) => handleChange('sortNr', value)}
            labelWidth="w-22"
            margintop="0"
          />
          <LabeledInput
            name="basePrice"
            label="Grundpris"
            type="number"
            value={item.basePrice}
            onChange={(value) => handleChange('basePrice', value)}
            labelWidth="w-22"
            margintop="2"
            suffix="kr"
          />
          <LabeledInput
            name="pricePerDay"
            label="Pris/dag"
            type="number"
            value={item.pricePerDay}
            onChange={(value) => handleChange('pricePerDay', value)}
            labelWidth="w-22"
            margintop="0"
            suffix="kr"
          />
          <LabeledInput
            name="pricePerWeek"
            label="Pris/vecka"
            type="number"
            value={item.pricePerWeek}
            onChange={(value) => handleChange('pricePerWeek', value)}
            labelWidth="w-22"
            margintop="0"
            suffix="kr"
          />
          <LabeledInput
            name="pricePerMonth"
            label="Pris/månad"
            type="number"
            value={item.pricePerMonth}
            onChange={(value) => handleChange('pricePerMonth', value)}
            labelWidth="w-22"
            margintop="0"
            suffix="kr"
          />
          <LabeledInput
            name="replacementCost"
            label="Ersättn.kost."
            type="number"
            value={item.replacementCost}
            onChange={(value) => handleChange('replacementCost', value)}
            labelWidth="w-22"
            margintop="0"
            suffix="kr"
          />
          <LabeledInput
            name="accountNr"
            label="Konto"
            value={item.accountNr ?? ''}
            onChange={(value) => handleChange('accountNr', value)}
            labelWidth="w-22"
            margintop="2"
          />
          <LabeledInput
            name="costCenterNr"
            label="Kostn.ställe"
            value={item.costCenterNr ?? ''}
            onChange={(value) => handleChange('costCenterNr', value)}
            labelWidth="w-22"
            margintop="0"
          />

        </span>

        <span className="pl-10">
          <LabeledTextArea
            name="note"
            label="Notering"
            labelPosition='top'
            value={item.note ?? ''}
            onChange={(value) => handleChange('note', value)}
            labelWidth="w-22"
            margintop="0"
            height="h-[75px]"
          />
          <LabeledTextArea
            name="popupText"
            label="Popuptext"
            labelPosition='top'
            value={item.popupText ?? ''}
            onChange={(value) => handleChange('popupText', value)}
            labelWidth="w-22"
            margintop="2"
            height="h-[75px]"
          />
          <div className="flex flex-row items-center space-x-2 mt-3">
            <LabeledSwitch
              name="unavailableForReservation"
              label="Ej bokningsbar"
              value={Boolean(item.unavailableForReservation)}
              onChange={(checked) => handleChange('unavailableForReservation', checked)}
              labelWidth="w-22"
            />
            <LabeledInput
              name="unavailableFrom"
              label="Peroid"
              type="date"
              value={formatDateInput(item.unavailableFrom)}
              onChange={(value) => handleChange('unavailableFrom', value || null)}
              margintop="0"
              inputWidth="w-18"
            />
            <LabeledInput
              name="unavailableTo"
              label=""
              type="date"
              value={formatDateInput(item.unavailableTo)}
              onChange={(value) => handleChange('unavailableTo', value || null)}
              margintop="0"
              inputWidth="w-18"
            />
          </div>
          <LabeledTextArea
            name="unavailableReason"
            label=""
            value={item.unavailableReason ?? ''}
            onChange={(value) => handleChange('unavailableReason', value)}
            labelWidth=""
            margintop="0"
            height="h-[40px]"
          />

        </span>

      </div>

      {canShowPackageLists && (
        <div className="mt-5 rounded-sm border border-gray-200 bg-white px-4 py-4">
          <div className="mb-3 text-xs font-medium text-gray-700">Paketdelar</div>
          {!item.id ? (
            <div className="rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Spara objektet först för att kunna koppla paketdelar.
            </div>
          ) : (
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_110px_minmax(0,1fr)]">
            <div>
              <div className="mb-1 text-xs text-gray-600">Tillgängliga ALU-delar (Ingår i paket = Ja)</div>
              <select
                multiple
                className="h-52 w-full rounded-sm border border-gray-300 px-2 py-1 text-xs"
                value={selectedAvailablePackageItemIds.map((id) => `${id}`)}
                onChange={handleAvailablePackageSelection}
              >
                {packageItems.availablePackageItems.map((packageItem) => (
                  <option key={packageItem.id} value={`${packageItem.id}`}>
                    {formatPackageItemLabel(packageItem)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col items-center justify-center gap-2">
              <button
                type="button"
                className="rounded-sm border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={movePackageItemsToConnected}
                disabled={selectedAvailablePackageItemIds.length === 0}
              >
                Lägg till &gt;&gt;
              </button>
              <button
                type="button"
                className="rounded-sm border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={movePackageItemsToAvailable}
                disabled={selectedConnectedPackageItemIds.length === 0}
              >
                &lt;&lt; Ta bort
              </button>
            </div>

            <div>
              <div className="mb-1 text-xs text-gray-600">Kopplade paketdelar</div>
              <div className="h-52 overflow-y-auto rounded-sm border border-gray-300">
                <table className="w-full border-collapse text-xs">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      <th className="border-b border-gray-200 px-2 py-1 text-left font-medium text-gray-600">Del</th>
                      <th className="border-b border-gray-200 px-2 py-1 text-left font-medium text-gray-600 w-24">Antal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packageItems.connectedPackageItems.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-2 py-2 text-gray-500">Inga kopplade paketdelar</td>
                      </tr>
                    ) : (
                      packageItems.connectedPackageItems.map((packageItem) => {
                        const isSelected = selectedConnectedPackageItemIds.includes(packageItem.id)

                        return (
                          <tr
                            key={packageItem.id}
                            className={`cursor-pointer border-b border-gray-100 ${isSelected ? 'bg-lime-50' : 'bg-white hover:bg-gray-50'}`}
                            onClick={() => handleConnectedPackageSelection(packageItem.id)}
                          >
                            <td className="px-2 py-1 text-gray-800">{formatPackageItemLabel(packageItem)}</td>
                            <td className="px-2 py-1">
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                className="h-6 w-full rounded-sm border border-gray-300 px-1 text-xs"
                                value={packageItem.quantity ?? 1}
                                onClick={(event) => event.stopPropagation()}
                                onChange={(event) => handleConnectedPackageQuantityChange(packageItem.id, event.target.value)}
                              />
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          )}
        </div>
      )}

      <div className="mt-5 w-50">
      </div>

    </div>
  )
}

function renderHakiTemplateFields(item, handleChange, handleSelectChange, formOptions) {
  return (
    <div className="w-full">
      <div className="grid gap-15 md:grid-cols-2 xl:grid-cols-[minmax(0,450px)_minmax(0,220px)_minmax(0,400px)] overflow-auto">

        <span>
          <LabeledInput
            name="itemNr"
            label="Namn"
            value={item.itemNr ?? ''}
            onChange={(value) => handleChange('itemNr', value)}
            labelWidth="w-22"
            margintop="0"
          />
          <LabeledSelect
            name="itemCategoryId"
            label="Kategori"
            value={item.itemCategoryId ?? ''}
            items={formOptions.itemCategoryOptions}
            placeholder="Välj kategori"
            onChange={(value) => handleSelectChange('itemCategoryId', value)}
            labelWidth="w-22"
            margintop="0"
          />
          <LabeledInput
            name="manufacturer"
            label="Fabrikat"
            value={item.manufacturer ?? ''}
            onChange={(value) => handleChange('manufacturer', value)}
            labelWidth="w-22"
            margintop="0"
          />
          <LabeledInput
            name="serialNr"
            label="Serienr"
            value={item.serialNr ?? ''}
            onChange={(value) => handleChange('serialNr', value)}
            labelWidth="w-22"
            inputWidth="w-32"
            margintop="2"
          />
          <LabeledInput
            name="weightKg"
            label="Vikt"
            type="number"
            value={item.weightKg}
            onChange={(value) => handleChange('weightKg', value)}
            labelWidth="w-22"
            inputWidth="w-32"
            margintop="0"
            suffix='kg'
          />
          <LabeledInput
            name="platformHeightMm"
            label="Plattformhöjd"
            type="number"
            integerOnly
            value={item.platformHeightMm}
            onChange={(value) => handleChange('platformHeightMm', value)}
            labelWidth="w-22"
            inputWidth="w-32"
            margintop="0"
            suffix="mm"
          />
          <LabeledInput
            name="platformLengthMm"
            label="Plattformlängd"
            type="number"
            integerOnly
            value={item.platformLengthMm}
            onChange={(value) => handleChange('platformLengthMm', value)}
            labelWidth="w-22"
            inputWidth="w-32"
            margintop="0"
            suffix="mm"
          />
          <LabeledInput
            name="nrOfItemsTotal"
            label="Tot. antal"
            type="number"
            integerOnly
            value={item.nrOfItemsTotal}
            onChange={(value) => handleChange('nrOfItemsTotal', value)}
            labelWidth="w-22"
            inputWidth="w-32"
            margintop="2"
          />
          <LabeledSwitch
            name="isStorageItem"
            label="Lagerartikel"
            value={Boolean(item.isStorageItem)}
            onChange={(checked) => handleChange('isStorageItem', checked)}
            labelWidth="w-22"
            marginTop="0"
          />
          <LabeledSwitch
            name="showInPlanning"
            label="Visa i planering"
            value={Boolean(item.showInPlanning)}
            onChange={(checked) => handleChange('showInPlanning', checked)}
            labelWidth="w-22"
            marginTop="0"
          />
          <LabeledSwitch
            name="isActive"
            label="Aktiv"
            value={Boolean(item.isActive)}
            onChange={(checked) => handleChange('isActive', checked)}
            labelWidth="w-22"
            marginTop="10"
          />

        </span>

        <span>
          <LabeledInput
            name="articleNr"
            label="Artikelnr"
            value={item.articleNr ?? ''}
            onChange={(value) => handleChange('articleNr', value)}
            labelWidth="w-22"
            margintop="0"
          />
          <LabeledInput
            name="sortNr"
            label="Sortnr"
            type="number"
            integerOnly
            value={item.sortNr}
            onChange={(value) => handleChange('sortNr', value)}
            labelWidth="w-22"
            margintop="0"
          />
          <LabeledInput
            name="basePrice"
            label="Grundpris"
            type="number"
            value={item.basePrice}
            onChange={(value) => handleChange('basePrice', value)}
            labelWidth="w-22"
            margintop="2"
            suffix="kr"
          />
          <LabeledInput
            name="pricePerDay"
            label="Pris/dag"
            type="number"
            value={item.pricePerDay}
            onChange={(value) => handleChange('pricePerDay', value)}
            labelWidth="w-22"
            margintop="0"
            suffix="kr"
          />
          <LabeledInput
            name="pricePerWeek"
            label="Pris/vecka"
            type="number"
            value={item.pricePerWeek}
            onChange={(value) => handleChange('pricePerWeek', value)}
            labelWidth="w-22"
            margintop="0"
            suffix="kr"
          />
          <LabeledInput
            name="pricePerMonth"
            label="Pris/månad"
            type="number"
            value={item.pricePerMonth}
            onChange={(value) => handleChange('pricePerMonth', value)}
            labelWidth="w-22"
            margintop="0"
            suffix="kr"
          />
          <LabeledInput
            name="replacementCost"
            label="Ersättn.kost."
            type="number"
            value={item.replacementCost}
            onChange={(value) => handleChange('replacementCost', value)}
            labelWidth="w-22"
            margintop="0"
            suffix="kr"
          />
          <LabeledInput
            name="accountNr"
            label="Konto"
            value={item.accountNr ?? ''}
            onChange={(value) => handleChange('accountNr', value)}
            labelWidth="w-22"
            margintop="2"
          />
          <LabeledInput
            name="costCenterNr"
            label="Kostn.ställe"
            value={item.costCenterNr ?? ''}
            onChange={(value) => handleChange('costCenterNr', value)}
            labelWidth="w-22"
            margintop="0"
          />

        </span>

        <span className="pl-10">
          <LabeledTextArea
            name="note"
            label="Notering"
            labelPosition='top'
            value={item.note ?? ''}
            onChange={(value) => handleChange('note', value)}
            labelWidth="w-22"
            margintop="0"
            height="h-[75px]"
          />
          <LabeledTextArea
            name="popupText"
            label="Popuptext"
            labelPosition='top'
            value={item.popupText ?? ''}
            onChange={(value) => handleChange('popupText', value)}
            labelWidth="w-22"
            margintop="2"
            height="h-[75px]"
          />
          <div className="flex flex-row items-center space-x-2 mt-3">
            <LabeledSwitch
              name="unavailableForReservation"
              label="Ej bokningsbar"
              value={Boolean(item.unavailableForReservation)}
              onChange={(checked) => handleChange('unavailableForReservation', checked)}
              labelWidth="w-22"
            />
            <LabeledInput
              name="unavailableFrom"
              label="Peroid"
              type="date"
              value={formatDateInput(item.unavailableFrom)}
              onChange={(value) => handleChange('unavailableFrom', value || null)}
              margintop="0"
              inputWidth="w-18"
            />
            <LabeledInput
              name="unavailableTo"
              label=""
              type="date"
              value={formatDateInput(item.unavailableTo)}
              onChange={(value) => handleChange('unavailableTo', value || null)}
              margintop="0"
              inputWidth="w-18"
            />
          </div>
          <LabeledTextArea
            name="unavailableReason"
            label=""
            value={item.unavailableReason ?? ''}
            onChange={(value) => handleChange('unavailableReason', value)}
            labelWidth=""
            margintop="0"
            height="h-[40px]"
          />

        </span>

      </div>

      <div className="mt-5 w-50">
      </div>

    </div>
  )
}

function renderToolAccessoryTemplateFields(item, handleChange, handleSelectChange, formOptions) {
  return (
    <div className="w-full">
      <div className="grid gap-15 md:grid-cols-2 xl:grid-cols-[minmax(0,450px)_minmax(0,220px)_minmax(0,400px)] overflow-auto">

        <span>
          <LabeledInput
            name="itemNr"
            label="Namn"
            value={item.itemNr ?? ''}
            onChange={(value) => handleChange('itemNr', value)}
            labelWidth="w-22"
            margintop="0"
          />
          <LabeledSelect
            name="itemCategoryId"
            label="Kategori"
            value={item.itemCategoryId ?? ''}
            items={formOptions.itemCategoryOptions}
            placeholder="Välj kategori"
            onChange={(value) => handleSelectChange('itemCategoryId', value)}
            labelWidth="w-22"
            margintop="0"
          />
          <LabeledInput
            name="manufacturer"
            label="Fabrikat"
            value={item.manufacturer ?? ''}
            onChange={(value) => handleChange('manufacturer', value)}
            labelWidth="w-22"
            margintop="0"
          />
          <LabeledInput
            name="serialNr"
            label="Serienr"
            value={item.serialNr ?? ''}
            onChange={(value) => handleChange('serialNr', value)}
            labelWidth="w-22"
            inputWidth="w-32"
            margintop="2"
          />
          <LabeledInput
            name="weightKg"
            label="Vikt"
            type="number"
            value={item.weightKg}
            onChange={(value) => handleChange('weightKg', value)}
            labelWidth="w-22"
            inputWidth="w-32"
            margintop="0"
            suffix='kg'
          />
          <LabeledInput
            name="nrOfItemsTotal"
            label="Tot. antal"
            type="number"
            integerOnly
            value={item.nrOfItemsTotal}
            onChange={(value) => handleChange('nrOfItemsTotal', value)}
            labelWidth="w-22"
            inputWidth="w-32"
            margintop="2"
          />
          <LabeledSwitch
            name="isStorageItem"
            label="Lagerartikel"
            value={Boolean(item.isStorageItem)}
            onChange={(checked) => handleChange('isStorageItem', checked)}
            labelWidth="w-22"
            marginTop="0"
          />
          <LabeledSwitch
            name="showInPlanning"
            label="Visa i planering"
            value={Boolean(item.showInPlanning)}
            onChange={(checked) => handleChange('showInPlanning', checked)}
            labelWidth="w-22"
            marginTop="0"
          />
          <LabeledSwitch
            name="isActive"
            label="Aktiv"
            value={Boolean(item.isActive)}
            onChange={(checked) => handleChange('isActive', checked)}
            labelWidth="w-22"
            marginTop="10"
          />

        </span>

        <span>
          <LabeledInput
            name="articleNr"
            label="Artikelnr"
            value={item.articleNr ?? ''}
            onChange={(value) => handleChange('articleNr', value)}
            labelWidth="w-22"
            margintop="0"
          />
          <LabeledInput
            name="sortNr"
            label="Sortnr"
            type="number"
            integerOnly
            value={item.sortNr}
            onChange={(value) => handleChange('sortNr', value)}
            labelWidth="w-22"
            margintop="0"
          />
          <LabeledInput
            name="basePrice"
            label="Grundpris"
            type="number"
            value={item.basePrice}
            onChange={(value) => handleChange('basePrice', value)}
            labelWidth="w-22"
            margintop="2"
            suffix="kr"
          />
          <LabeledInput
            name="pricePerDay"
            label="Pris/dag"
            type="number"
            value={item.pricePerDay}
            onChange={(value) => handleChange('pricePerDay', value)}
            labelWidth="w-22"
            margintop="0"
            suffix="kr"
          />
          <LabeledInput
            name="pricePerWeek"
            label="Pris/vecka"
            type="number"
            value={item.pricePerWeek}
            onChange={(value) => handleChange('pricePerWeek', value)}
            labelWidth="w-22"
            margintop="0"
            suffix="kr"
          />
          <LabeledInput
            name="pricePerMonth"
            label="Pris/månad"
            type="number"
            value={item.pricePerMonth}
            onChange={(value) => handleChange('pricePerMonth', value)}
            labelWidth="w-22"
            margintop="0"
            suffix="kr"
          />
          <LabeledInput
            name="replacementCost"
            label="Ersättn.kost."
            type="number"
            value={item.replacementCost}
            onChange={(value) => handleChange('replacementCost', value)}
            labelWidth="w-22"
            margintop="0"
            suffix="kr"
          />
          <LabeledInput
            name="accountNr"
            label="Konto"
            value={item.accountNr ?? ''}
            onChange={(value) => handleChange('accountNr', value)}
            labelWidth="w-22"
            margintop="2"
          />
          <LabeledInput
            name="costCenterNr"
            label="Kostn.ställe"
            value={item.costCenterNr ?? ''}
            onChange={(value) => handleChange('costCenterNr', value)}
            labelWidth="w-22"
            margintop="0"
          />

        </span>

        <span className="pl-10">
          <LabeledTextArea
            name="note"
            label="Notering"
            labelPosition='top'
            value={item.note ?? ''}
            onChange={(value) => handleChange('note', value)}
            labelWidth="w-22"
            margintop="0"
            height="h-[75px]"
          />
          <LabeledTextArea
            name="popupText"
            label="Popuptext"
            labelPosition='top'
            value={item.popupText ?? ''}
            onChange={(value) => handleChange('popupText', value)}
            labelWidth="w-22"
            margintop="2"
            height="h-[75px]"
          />
          <div className="flex flex-row items-center space-x-2 mt-3">
            <LabeledSwitch
              name="unavailableForReservation"
              label="Ej bokningsbar"
              value={Boolean(item.unavailableForReservation)}
              onChange={(checked) => handleChange('unavailableForReservation', checked)}
              labelWidth="w-22"
            />
            <LabeledInput
              name="unavailableFrom"
              label="Peroid"
              type="date"
              value={formatDateInput(item.unavailableFrom)}
              onChange={(value) => handleChange('unavailableFrom', value || null)}
              margintop="0"
              inputWidth="w-18"
            />
            <LabeledInput
              name="unavailableTo"
              label=""
              type="date"
              value={formatDateInput(item.unavailableTo)}
              onChange={(value) => handleChange('unavailableTo', value || null)}
              margintop="0"
              inputWidth="w-18"
            />
          </div>
          <LabeledTextArea
            name="unavailableReason"
            label=""
            value={item.unavailableReason ?? ''}
            onChange={(value) => handleChange('unavailableReason', value)}
            labelWidth=""
            margintop="0"
            height="h-[40px]"
          />

        </span>

      </div>

      <div className="mt-5 w-50">
      </div>

    </div>
  )
}

function renderTemplateByItemType(
  item,
  handleChange,
  handleSelectChange,
  handleDateChange,
  formOptions,
  packageItems,
  selectedAvailablePackageItemIds,
  selectedConnectedPackageItemIds,
  handleAvailablePackageSelection,
  handleConnectedPackageSelection,
  handleConnectedPackageQuantityChange,
  movePackageItemsToConnected,
  movePackageItemsToAvailable,
) {
  const code = getItemTypeCode(item.itemTypeCode)

  if (!code) {
    return null
  }

  switch (code) {
    case 'VEHICLE':
      return renderVehicleTemplateFields(item, handleChange, handleSelectChange, handleDateChange, formOptions)
    case 'LIFT':
      return renderLiftTemplateFields(item, handleChange, handleSelectChange, handleDateChange, formOptions)
    case 'ALU':
      return renderAluTemplateFields(
        item,
        handleChange,
        handleSelectChange,
        formOptions,
        packageItems,
        selectedAvailablePackageItemIds,
        selectedConnectedPackageItemIds,
        handleAvailablePackageSelection,
        handleConnectedPackageSelection,
        handleConnectedPackageQuantityChange,
        movePackageItemsToConnected,
        movePackageItemsToAvailable,
      )
    case 'HAKI':
      return renderHakiTemplateFields(item, handleChange, handleSelectChange, formOptions)
    case 'TOOL':
    case 'ACCESSORY':
      return renderToolAccessoryTemplateFields(item, handleChange, handleSelectChange, formOptions)
    default:
      return renderEmptyTemplateFields(code)
  }
}

export default function Item() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const routeItemId = params.id ?? 'new'
  const initialItemTypeCode = getItemTypeCode(location.state?.initialItemTypeCode)

  const [item, setItem] = useState(null)
  const [originalItem, setOriginalItem] = useState(null)
  const [messages, setMessages] = useState([])
  const [formOptions, setFormOptions] = useState({
    itemTypeOptions: [],
    itemCategoryOptions: [],
    itemModelOptions: [],
  })
  const [isLoadingItem, setIsLoadingItem] = useState(false)
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)
  const [showItemTypeEditor, setShowItemTypeEditor] = useState(false)
  const [packageItems, setPackageItems] = useState({
    availablePackageItems: [],
    connectedPackageItems: [],
  })
  const [selectedAvailablePackageItemIds, setSelectedAvailablePackageItemIds] = useState([])
  const [selectedConnectedPackageItemIds, setSelectedConnectedPackageItemIds] = useState([])
  const showItemSkeleton = useDelayedSkeleton(isLoadingItem, 250)
  const skipUnsavedGuardRef = useRef(false)

  function clearPackageListState() {
    setPackageItems({
      availablePackageItems: [],
      connectedPackageItems: [],
    })
    setSelectedAvailablePackageItemIds([])
    setSelectedConnectedPackageItemIds([])
  }

  function hasUnsavedChanges() {
    if (skipUnsavedGuardRef.current) {
      return false
    }

    if (!item || !originalItem) {
      return false
    }

    return JSON.stringify(normalizeItemForComparison(item)) !== JSON.stringify(normalizeItemForComparison(originalItem))
  }

  const navigationBlocker = useBlocker(({ currentLocation, nextLocation }) => {
    return hasUnsavedChanges() && currentLocation.pathname !== nextLocation.pathname
  })

  useEffect(() => {
    if (navigationBlocker.state === 'blocked') {
      setShowUnsavedWarning(true)
    }
  }, [navigationBlocker.state])

  useEffect(() => {
    function handleBeforeUnload(event) {
      if (!hasUnsavedChanges()) {
        return
      }

      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [item, originalItem])

  useEffect(() => {
    let isActive = true

    getSharedRequest('operations-item-form-options', () => getItemFormOptions())
      .then((options) => {
        if (!isActive) {
          return
        }

        setFormOptions(options)
      })
      .catch((error) => {
        if (!isActive) {
          return
        }

        const errorText = error?.payload?.message ?? error?.message ?? 'Kunde inte hämta formulärval.'
        setMessages([{ type: 'error', text: errorText }])
      })

    return () => {
      isActive = false
    }
  }, [])

  function handleUnsavedWarningClose() {
    setShowUnsavedWarning(false)

    if (navigationBlocker.state === 'blocked') {
      navigationBlocker.reset()
    }
  }

  function handleUnsavedWarningConfirm() {
    setShowUnsavedWarning(false)

    if (navigationBlocker.state === 'blocked') {
      navigationBlocker.proceed()
    }
  }

  function handleChange(field, value) {
    setMessages((prev) => prev.filter((message) => message.type !== 'success'))
    setItem((prev) => {
      const nextItem = {
        ...prev,
        [field]: value,
      }

      if (getItemTypeCode(prev.itemTypeCode) === 'VEHICLE' && (field === 'itemNr' || field === 'regNr')) {
        nextItem.itemNr = value
        nextItem.regNr = value
      }

      return nextItem
    })

    if (field === 'isPartOfPackage' && value) {
      clearPackageListState()
      setItem((prev) => ({
        ...prev,
        packageItemIds: [],
        packageItems: [],
      }))
    }

    if (field === 'itemTypeCode') {
      setShowItemTypeEditor(false)

      if (!isAluItemTypeCode(value)) {
        clearPackageListState()
        setItem((prev) => ({
          ...prev,
          packageItemIds: [],
          packageItems: [],
        }))
      }
    }
  }

  function handleAvailablePackageSelection(event) {
    const ids = Array.from(event.target.selectedOptions)
      .map((option) => Number(option.value))
      .filter((id) => Number.isInteger(id) && id > 0)

    setSelectedAvailablePackageItemIds(ids)
  }

  function handleConnectedPackageSelection(packageItemId) {
    const normalizedId = Number(packageItemId)
    if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
      return
    }

    setSelectedConnectedPackageItemIds((prev) => (
      prev.includes(normalizedId)
        ? prev.filter((id) => id !== normalizedId)
        : [...prev, normalizedId]
    ))
  }

  function handleConnectedPackageQuantityChange(packageItemId, value) {
    const normalizedId = Number(packageItemId)
    if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
      return
    }

    const parsedValue = Number(value)
    const quantity = Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1

    setPackageItems((prev) => ({
      ...prev,
      connectedPackageItems: prev.connectedPackageItems.map((packageItem) => (
        packageItem.id === normalizedId
          ? { ...packageItem, quantity }
          : packageItem
      )),
    }))

    setItem((prev) => ({
      ...prev,
      packageItems: normalizePackageItems((prev.packageItems ?? []).map((entry) => (
        entry.packageItemId === normalizedId
          ? { ...entry, quantity }
          : entry
      ))),
    }))
  }

  function movePackageItemsToConnected() {
    if (selectedAvailablePackageItemIds.length === 0) {
      return
    }

    const selectedSet = new Set(selectedAvailablePackageItemIds)

    setPackageItems((prev) => {
      const moveItems = prev.availablePackageItems.filter((packageItem) => selectedSet.has(packageItem.id))
      const nextAvailable = prev.availablePackageItems.filter((packageItem) => !selectedSet.has(packageItem.id))
      const nextConnected = [...prev.connectedPackageItems, ...moveItems.map((packageItem) => ({
        ...packageItem,
        quantity: Number(packageItem.quantity ?? 1),
      }))]

      return {
        availablePackageItems: nextAvailable,
        connectedPackageItems: nextConnected,
      }
    })

    setItem((prev) => {
      const existingById = new Map(normalizePackageItems(prev.packageItems).map((entry) => [entry.packageItemId, entry.quantity]))

      selectedAvailablePackageItemIds.forEach((packageItemId) => {
        if (!existingById.has(packageItemId)) {
          existingById.set(packageItemId, 1)
        }
      })

      const packageItemsWithQuantity = Array.from(existingById.entries()).map(([packageItemId, quantity]) => ({
        packageItemId,
        quantity,
      }))
      const normalizedPackageItems = normalizePackageItems(packageItemsWithQuantity)

      return {
        ...prev,
        packageItems: normalizedPackageItems,
        packageItemIds: normalizedPackageItems.map((entry) => entry.packageItemId),
      }
    })

    setSelectedAvailablePackageItemIds([])
  }

  function movePackageItemsToAvailable() {
    if (selectedConnectedPackageItemIds.length === 0) {
      return
    }

    const selectedSet = new Set(selectedConnectedPackageItemIds)

    setPackageItems((prev) => {
      const moveItems = prev.connectedPackageItems.filter((packageItem) => selectedSet.has(packageItem.id))
      const nextConnected = prev.connectedPackageItems.filter((packageItem) => !selectedSet.has(packageItem.id))
      const nextAvailable = [...prev.availablePackageItems, ...moveItems]

      return {
        availablePackageItems: nextAvailable,
        connectedPackageItems: nextConnected,
      }
    })

    setItem((prev) => {
      const remainingPackageItems = normalizePackageItems(prev.packageItems)
        .filter((entry) => !selectedSet.has(entry.packageItemId))

      return {
        ...prev,
        packageItems: remainingPackageItems,
        packageItemIds: remainingPackageItems.map((entry) => entry.packageItemId),
      }
    })

    setSelectedConnectedPackageItemIds([])
  }

  function handleSelectChange(field, value) {
    handleChange(field, value ? Number(value) : null)
  }

  function handleDateChange(field, value) {
    handleChange(field, value || null)
  }

  async function loadItem(itemId, { dedupe = false, isActive = () => true } = {}) {
    setIsLoadingItem(true)

    try {
      if (itemId === 'new') {
        if (!isActive()) {
          return
        }

        const emptyItem = cloneItem(EMPTY_ITEM)
        if (initialItemTypeCode) {
          emptyItem.itemTypeCode = initialItemTypeCode
        }
        setItem(emptyItem)
        setOriginalItem(cloneItem(emptyItem))
        return
      }

      const fetchItem = () => getItemById(itemId)
      const data = dedupe
        ? await getSharedRequest(`item:${itemId}`, fetchItem)
        : await fetchItem()

      if (!isActive()) {
        return
      }

      setItem(data)
      setOriginalItem(cloneItem(data))
    } catch (error) {
      if (!isActive()) {
        return
      }

      const errorText = error?.payload?.message ?? error?.message ?? 'Kunde inte hämta objekt.'
      setMessages([{ type: 'error', text: errorText }])
    } finally {
      if (isActive()) {
        setIsLoadingItem(false)
      }
    }
  }

  function handleBackClick() {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    window.close()
  }

  useEffect(() => {
    let isActive = true

    skipUnsavedGuardRef.current = false
    setShowItemTypeEditor(false)

    loadItem(routeItemId, {
      dedupe: true,
      isActive: () => isActive,
    })

    return () => {
      isActive = false
    }
  }, [routeItemId, initialItemTypeCode])

  useEffect(() => {
    let isActive = true

    if (!item || !isAluItemTypeCode(item.itemTypeCode) || item.isPartOfPackage || !item.id) {
      clearPackageListState()
      return () => {
        isActive = false
      }
    }

    getItemPackageItems(item.id)
      .then((data) => {
        if (!isActive) {
          return
        }

        setPackageItems(data)
        setSelectedAvailablePackageItemIds([])
        setSelectedConnectedPackageItemIds([])
        const nextPackageItemIds = normalizePackageItemIds(
          data.connectedPackageItems.map((packageItem) => packageItem.id),
        )
        const nextPackageItems = normalizePackageItems(
          data.connectedPackageItems.map((packageItem) => ({
            packageItemId: packageItem.id,
            quantity: packageItem.quantity,
          })),
        )

        setItem((prev) => {
          const prevPackageItemIds = normalizePackageItemIds(prev?.packageItemIds)
          const prevPackageItems = normalizePackageItems(prev?.packageItems)

          if (sameNumberArray(prevPackageItemIds, nextPackageItemIds) && JSON.stringify(prevPackageItems) === JSON.stringify(nextPackageItems)) {
            return prev
          }

          return {
            ...prev,
            packageItemIds: nextPackageItemIds,
            packageItems: nextPackageItems,
          }
        })
      })
      .catch((error) => {
        if (!isActive) {
          return
        }

        const errorText = error?.payload?.message ?? error?.message ?? 'Kunde inte hämta paketdelar.'
        setMessages((prev) => [...prev.filter((message) => message.type !== 'error'), { type: 'error', text: errorText }])
      })

    return () => {
      isActive = false
    }
  }, [item?.id, item?.itemTypeCode, item?.isPartOfPackage])

  async function submitItem(event) {
    event.preventDefault()

    if (!item) {
      return
    }

    if (!item.itemTypeCode?.trim()) {
      setMessages([{ type: 'error', text: 'Objekttyp måste anges.' }])
      return
    }

    try {
      let itemId = item.id

      if (routeItemId === 'new' || !item.id) {
        itemId = await createItem(item)
      } else {
        itemId = await updateItem(item.id, item)
      }

      const refreshedItem = await getItemById(itemId)
      setItem(refreshedItem)
      setOriginalItem(cloneItem(refreshedItem))
      setMessages([{ type: 'success', text: 'Objekt sparat' }])

      if (`${routeItemId}` !== `${itemId}`) {
        skipUnsavedGuardRef.current = true
        navigate(`/item/${itemId}`, { replace: true, state: { originModule: 'operations' } })
      }
    } catch (error) {
      const errorText = error?.payload?.message ?? error?.message ?? 'Kunde inte spara objekt.'
      setMessages([{ type: 'error', text: errorText }])
    }
  }

  if (!item) {
    if (showItemSkeleton) {
      return (
        <div className="flex h-full min-h-full w-full flex-1 flex-col px-0 py-0 md:px-[clamp(8px,5vw,10vw)]">
          <div className="mt-1 flex min-h-0 flex-1 flex-col">
            <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8 lg:items-stretch">
              <aside className="text-gray-700 mt-6 pr-3 border-b border-gray-300 lg:border-b-0 lg:border-r mb-8">
                <div className="space-y-2 text-xs text-gray-600 ml-2">
                  <Skeleton height={30} />
                  <Skeleton height={30} width="92%" />
                </div>
              </aside>

              <section className="lg:pl-2">
                <div className="pb-3">
                  <Skeleton height={14} width={220} />
                </div>
                <Skeleton height={30} width={220} className="mb-4" />
                <div className="grid gap-15 md:grid-cols-[360px_380px_200px] overflow-auto">
                  <Skeleton height={24} count={8} />
                  <Skeleton height={24} count={8} />
                  <Skeleton height={24} count={8} />
                </div>
              </section>
            </div>
          </div>
        </div>
      )
    }

    return null
  }

  const renderMetaRow = (label, value, userName) => {
    return (
      <div className="grid grid-cols-21 gap-1">
        <div className="col-span-5"><span>{label}</span></div>
        <div className="col-span-8">{value && formatDateTime(value)}</div>
        <div className="col-span-8 text-gray-500">{userName && `av ${userName}`}</div>
      </div>
    )
  }

  function handleItemTypeButtonClick() {
    setShowItemTypeEditor((prev) => !prev)
  }

  const hasItemType = Boolean(getItemTypeCode(item.itemTypeCode))

  return (
    <div className="flex h-full min-h-full w-full flex-1 flex-col px-0 py-0 md:px-[clamp(8px,5vw,10vw)]">
      <ConfirmationModal
        isOpen={showUnsavedWarning}
        onClose={handleUnsavedWarningClose}
        onConfirm={handleUnsavedWarningConfirm}
        title="OSPARADE ÄNDRINGAR"
        message="Du har osparade ändringar. Vill du fortsätta utan att spara?"
        confirmText="Fortsätt"
        cancelText="Stanna kvar"
        isDestructive
      />

      <div className="mt-1 flex min-h-0 flex-1 flex-col">
        <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8 lg:items-stretch">

          <aside className="mt-6 border-b border-gray-300 pr-3 lg:mb-8 lg:border-b-0 lg:border-r">
            <div className="space-y-4 py-0 pb-4 pl-2 pr-0">
              <h2 className="text-center text-sm text-gray-500">Info</h2>
              <div className="space-y-2 text-xs text-gray-500" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
                {renderMetaRow('Skapad:', item.createdAt, item.createdByName)}
                {renderMetaRow('Ändrad:', item.updatedAt, item.updatedByName)}
              </div>
            </div>
            <div className="border-b border-gray-300" />

            <div className="space-y-4 py-4 pl-2 pr-0">
              <h2 className="text-center text-sm text-gray-500">Meddelanden</h2>
              <div className="space-y-2 text-xs text-gray-600">
                {messages.map((message, index) => (
                  <div
                    key={message.id ?? `${message.type}-${message.text}-${index}`}
                    className={`rounded-sm border px-3 py-2 text-center text-xs ${message.type === 'error'
                      ? 'border-rose-200 bg-rose-50 text-rose-800'
                      : 'border-emerald-200 bg-emerald-100 text-emerald-800'
                      }`}
                  >
                    {message.text}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-b border-gray-300" />
          </aside>

          <section className="lg:pl-2">
            <h2 className="text-sm pb-3 text-gray-500 uppercase tracking-[0.10em] font-semibold">{item.itemNr || 'Nytt objekt'}</h2>
            <div className="mb-4 flex w-full justify-between space-x-4">
              <div className="flex items-center gap-6">
                <ActionButton label="Tillbaka" icon={ArrowLeft} onClick={handleBackClick} accent="sky" />
                <ActionButton label="Spara" icon={Save} onClick={submitItem} accent="lime" />
                <ActionButton
                  label={hasItemType ? 'Ändra objekttyp' : 'Välj objekttyp'}
                  icon={Pencil}
                  onClick={handleItemTypeButtonClick}
                  accent="teal"
                />
              </div>
            </div>

            <form autoComplete="off" className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto" onSubmit={submitItem}>
              {showItemTypeEditor && (
                <div className="w-full rounded-sm border border-gray-200 bg-white px-4 py-4">
                  <LabeledSelect
                    name="itemTypeCode"
                    label="Objekttyp"
                    labelPosition="top"
                    value={item.itemTypeCode ?? ''}
                    items={formOptions.itemTypeOptions.map((option) => ({ id: option.code, name: option.name }))}
                    placeholder="Välj objekttyp"
                    onChange={(value) => handleChange('itemTypeCode', value)}
                    margintop="0"
                    className="border-lime-600"
                  />
                </div>
              )}

              {!hasItemType ? (
                <div className="w-full rounded-sm border border-amber-200 bg-amber-50 px-4 py-4 text-xs text-amber-800">
                  Objekttyp måste anges innan fältmallen kan visas.
                </div>
              ) : (
                <div className="w-full">
                  {renderTemplateByItemType(
                    item,
                    handleChange,
                    handleSelectChange,
                    handleDateChange,
                    formOptions,
                    packageItems,
                    selectedAvailablePackageItemIds,
                    selectedConnectedPackageItemIds,
                    handleAvailablePackageSelection,
                    handleConnectedPackageSelection,
                    handleConnectedPackageQuantityChange,
                    movePackageItemsToConnected,
                    movePackageItemsToAvailable,
                  )}
                </div>
              )}
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}
