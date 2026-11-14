import ReactSelect from 'react-select';

const LabeledSelect = ({
  label,
  labelPosition = 'left',
  labelWidth,
  inputWidth,
  margintop,
  name,
  value,
  items = [],
  placeholder,
  onChange,
  disabled,
  optionCategoryKey,
  ...props }) => {
  const usesCategoryColumn = Boolean(optionCategoryKey);
  const options = usesCategoryColumn
    ? items.map((item) => ({
      value: item.id,
      label: item.name,
      category: item[optionCategoryKey] ?? '',
      isDisabled: item.isActive === false,
    }))
    : [];
  const selectedOption = usesCategoryColumn
    ? options.find((option) => String(option.value) === String(value)) ?? null
    : null;

  return (
    <div className={`w-full pb-[1px] mt-${margintop} ${labelPosition === 'top' ? 'flex flex-col' : 'flex items-center'}`}>
      <div className={`relative flex flex-none justify-between ${labelPosition === 'top' ? 'w-full items-center' : `items-center ${labelWidth}`}`}>
        <label className={`text-xs leading-none text-gray-700 ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}>{label}</label>
      </div>

      <div className="flex flex-row items-center w-full">
        {usesCategoryColumn ? (
          <ReactSelect
            {...props}
            name={name}
            options={options}
            value={selectedOption}
            onChange={(selected) => onChange(selected?.value ?? '')}
            isDisabled={disabled}
            isSearchable={false}
            isClearable={false}
            placeholder={placeholder}
            formatOptionLabel={(option, { context }) => context === 'menu' ? (
              <span className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3">
                <span className="truncate">{option.category}</span>
                <span className="truncate">{option.label}</span>
              </span>
            ) : option.label}
            className={`text-xs ${inputWidth || 'w-full'}`}
            styles={{
              control: (provided, state) => ({
                ...provided,
                minHeight: 28,
                height: 28,
                borderRadius: 4,
                borderColor: state.isFocused ? '#9ca3af' : '#d1d5db',
                boxShadow: 'none',
                backgroundColor: disabled ? 'transparent' : 'white',
                ':hover': { borderColor: '#9ca3af' },
              }),
              valueContainer: (provided) => ({ ...provided, height: 28, padding: '0 4px' }),
              indicatorsContainer: (provided) => ({ ...provided, height: 28 }),
              dropdownIndicator: (provided) => ({ ...provided, padding: '0 4px', color: '#6b7280' }),
              indicatorSeparator: () => ({ display: 'none' }),
              option: (provided, state) => ({
                ...provided,
                fontSize: 12,
                padding: '6px 8px',
                backgroundColor: state.isFocused ? '#f3f4f6' : 'white',
                color: '#374151',
              }),
              singleValue: (provided) => ({ ...provided, fontSize: 12, color: '#111827' }),
              placeholder: (provided) => ({ ...provided, fontSize: 12, color: '#374151' }),
              menu: (provided) => ({ ...provided, zIndex: 60 }),
            }}
          />
        ) : (
          <select
            name={name}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className={`text-xs leading-none ${inputWidth || 'w-full'} h-6 border border-gray-300 rounded-sm px-1 focus:outline-none bg-white disabled:bg-transparent disabled:text-gray-500`}
            disabled={disabled}
            {...props}
          >
            {placeholder && (
              <option value="">{placeholder}</option>
            )}
            {items.map((item) => {
              const isInactive = item.isActive === false;
              const isSelected = String(item.id) === String(value);
              return (
                <option
                  key={item.id}
                  value={item.id}
                  disabled={isInactive}
                  hidden={isInactive && !isSelected}
                >
                  {item.name}
                </option>
              );
            })}
          </select>
        )}
      </div>
    </div>
  );
};

export default LabeledSelect;