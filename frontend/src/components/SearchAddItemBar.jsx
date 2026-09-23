

const SearchAddItemBar = ({ label, labelWidth, margintop, name, value, onChange, onAdd, ...props }) => {
    return (
        <div className={`flex items-center space-x-4 w-full pb-[1px] mt-${margintop}`}>
            <label className={`labelWidth text-xs text-gray-700`}>{label}</label>
            <input
                name={name}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="text-xs w-full border border-gray-300 rounded-sm px-2 py-1 focus:outline-none bg-white"
                {...props}
            />
            <button
                onClick={onAdd} 
                className="w-50 text-xs text-gray bg-blue-200 hover:bg-blue-300 p-[5px] rounded-sm">Skapa ny</button>
        </div>
    );
};

export default SearchAddItemBar;