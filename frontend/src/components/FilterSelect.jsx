import Select from 'react-select'

function getFilterSelectStyles() {
  return {
    control: (base, state) => ({
      ...base,
      minHeight: 28,
      height: 'auto',
      borderRadius: state.isMulti && state.hasValue ? 14 : 9999,
      borderColor: state.isFocused ? '#65a30d' : '#84cc16',
      boxShadow: 'none',
      ':hover': {
        borderColor: state.isFocused ? '#65a30d' : '#84cc16',
      },
      backgroundColor: 'white',
    }),
    valueContainer: (base) => ({
      ...base,
      minHeight: 28,
      height: 'auto',
      flexWrap: 'wrap',
      padding: '1px 12px',
      fontSize: '12px',
    }),
    indicatorsContainer: (base) => ({
      ...base,
      minHeight: 28,
      alignItems: 'center',
    }),
    clearIndicator: (base, state) => ({
      ...base,
      padding: '0 0px 0 6px',
      color: state.isFocused ? '#d97706' : '#f59e0b',
      cursor: 'pointer',
      ':hover': {
        color: '#d97706',
      },
    }),
    dropdownIndicator: (base, state) => ({
      ...base,
      padding: '0px 8px 0px 0px',
      color: state.isFocused ? '#6b7280' : '#9ca3af',
      ':hover': {
        color: '#6b7280',
      },
    }),
    indicatorSeparator: () => ({
      display: 'none',
    }),
    input: (base) => ({
      ...base,
      margin: 0,
      padding: 0,
      fontSize: '12px',
    }),
    option: (base, state) => ({
      ...base,
      fontSize: '12px',
      backgroundColor: state.isFocused ? '#f7fee7' : 'white',
      color: '#374151',
    }),
    singleValue: (base) => ({
      ...base,
      fontSize: '12px',
      color: '#374151',
    }),
    multiValue: (base) => ({
      ...base,
      margin: '2px 4px 2px 0',
      borderRadius: 9999,
      backgroundColor: '#f7fee7',
    }),
    multiValueLabel: (base) => ({
      ...base,
      fontSize: '11px',
      color: '#374151',
      padding: '1px 4px 1px 8px',
    }),
    multiValueRemove: (base) => ({
      ...base,
      borderRadius: 9999,
      color: '#9ca3af',
      ':hover': {
        backgroundColor: '#ecfccb',
        color: '#65a30d',
      },
    }),
    placeholder: (base) => ({
      ...base,
      fontSize: '12px',
      color: '#374151',
      fontWeight: 400,
    }),
    menu: (base) => ({
      ...base,
      zIndex: 60,
    }),
  }
}

export default function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  isDisabled = false,
  isSearchable = false,
  isClearable = true,
  width = 'w-full',
  className = '',
  ...props
}) {
  const combinedClassName = [width, className].filter(Boolean).join(' ')

  return (
    <Select
      value={value}
      onChange={onChange}
      options={options}
      className={combinedClassName}
      placeholder={placeholder}
      isDisabled={isDisabled}
      isSearchable={isSearchable}
      isClearable={isClearable}
      styles={getFilterSelectStyles()}
      {...props}
    />
  )
}