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
  ...props }) => {
  return (
    <div className={`w-full pb-[1px] mt-${margintop} ${labelPosition === 'top' ? 'flex flex-col gap-1' : 'flex items-center space-x-1'}`}>
      <div className={`relative flex flex-none justify-between ${labelPosition === 'top' ? 'w-full items-center' : `items-center ${labelWidth}`}`}>
        <label className="text-xs leading-none text-gray-700">{label}</label>
      </div>

      <div className="flex flex-row items-center w-full">
        <select
          name={name}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={`text-xs leading-none ${inputWidth || 'w-full'} border border-gray-300 rounded-sm px-1 py-[calc(0.26rem-1px)] focus:outline-none bg-white disabled:bg-transparent disabled:text-gray-500`}
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
      </div>
    </div>
  );
};

export default LabeledSelect;