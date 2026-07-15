import SwitchSelector from 'react-switch-selector'

const ACTIVE_INACTIVE_OPTIONS = [
  {
    label: <span className="py-[0px] text-gray-900">Aktiva</span>,
    value: 'active',
    fontColor: '#111827',
  },
  {
    label: <span className="py-[0px] text-gray-900">+ Inaktiva</span>,
    value: 'includeInactive',
    fontColor: '#111827',
  },
]

const DEFAULT_SELECTED_BG = {
  active: 'var(--color-green-200)',
  includeInactive: 'var(--color-green-200)',
}

export default function ActiveInactiveSwitch({
  value = 'active',
  onChange,
  name = 'active-inactive-switch',
  selectedBackgroundByValue = DEFAULT_SELECTED_BG,
  className = '',
}) {
  const selectedBackgroundColor = selectedBackgroundByValue[value] ?? selectedBackgroundByValue.active

  return (
    <div className={`inline-flex h-7 items-center rounded-full border border-lime-600 bg-lime-50 p-px transition hover:border-lime-700 ${className}`.trim()}>
      <div className="h-full w-33 overflow-hidden rounded-full text-xs">
        <SwitchSelector
          name={name}
          options={ACTIVE_INACTIVE_OPTIONS}
          forcedSelectedIndex={value === 'active' ? 0 : 1}
          onChange={(nextValue) => {
            onChange?.(nextValue)
          }}
          backgroundColor="transparent"
          selectedBackgroundColor={selectedBackgroundColor}
        />
      </div>
    </div>
  )
}