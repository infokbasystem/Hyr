
const LabeledSelect = ({ label, labelWidth, margintop, name, value, items, onChange, ...props }) => {

    return (
        <div className={`flex items-center space-x-1 w-full pb-[1px] mt-${margintop}`}>
            <label className={`${labelWidth || ''} flex-none text-xs text-gray-700`}>{label}</label>
            <select
                name={name}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="text-xs w-full border border-gray-300 rounded-sm px-1 py-1 focus:outline-none bg-white"
                {...props}
            >
                {items?.map((item) => (
                    <option key={item.id} value={item.id} hidden={item.isActive || !item.isActive ? '' : 'hidden'}>
                        {item.name}
                    </option>
                ))}
            </select>
        </div>
    );

};

export default LabeledSelect;