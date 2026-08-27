import Select from 'react-select'

function getFilterSelectStyles() {
  return {
    control: (base, state) => ({
      ...base,
      minHeight: 28,
      height: 28,
      borderRadius: 9999,
      borderColor: state.isFocused ? '#65a30d' : '#84cc16',
      boxShadow: 'none',
      ':hover': {
        borderColor: state.isFocused ? '#65a30d' : '#84cc16',
      },
      backgroundColor: 'white',
    }),
    valueContainer: (base) => ({
      ...base,
      height: 28,
      padding: '0 12px',
      fontSize: '12px',
    }),
    indicatorsContainer: (base) => ({
      ...base,
      height: 28,
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
      padding: '0 8px 0 0px',
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