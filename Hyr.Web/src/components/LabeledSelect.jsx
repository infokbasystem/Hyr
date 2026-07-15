const LabeledSelect = ({
  label,
  labelWidth,
  inputWidth,
  margintop,
  name,
  value,
  items,
  onChange,
  disabled,
  ...props }) => {
  const selectedItem = items?.find(it => String(it.id) === String(value));

  return (
    <div className={`flex items-center space-x-1 w-full pb-[1px] mt-${margintop}`}>
      <div className={`relative flex items-center flex-none justify-between ${labelWidth}`}>
        <label className="text-xs leading-none text-gray-700">{label}</label>
      </div>

      <div className="flex flex-row items-center w-full">
        {/* <div className="relative w-full">
        </div> */}
          <select
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`text-xs leading-none ${inputWidth || 'w-full'} border border-gray-300 rounded-sm px-1 py-[calc(0.26rem-1px)] focus:outline-none bg-white disabled:bg-transparent disabled:text-gray-500`}
            disabled={disabled}
            {...props}
          >
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