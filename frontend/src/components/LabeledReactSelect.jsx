import Select, { components as ReactSelectComponents } from 'react-select';
import { ChevronDown, ExternalLink } from 'lucide-react';

const LabeledReactSelect = ({
    label,
    labelWidth,
    inputWidth,
    margintop,
    name,
    value,
    items,
    onChange,
    disableInactive,
    allowRawValueLabel = false,
    optionCategoryKey,
    optionCategoryWidth,
    filterStyle = false,
    fitMenuToContent = false,
    openInNewTabUrl,
    openInNewTabLabel = 'Öppna i ny flik',
    disabled = false,
    ...props
}) => {
    const normalizedItems = Array.isArray(items) ? items : [];

    const options = normalizedItems
        .filter(i => !disableInactive || i.isActive !== false)
        .map(i => ({
            value: i.id,
            label: i.name,
            ...(optionCategoryKey ? { category: i[optionCategoryKey] ?? '' } : {}),
        }));

    const isMultiSelect = Boolean(props.isMulti);

    const selectedValue = isMultiSelect
        ? (value == null
            ? options
            : options.filter(opt => Array.isArray(value) && value.some(v => String(v) === String(opt.value))))
        : (options.find(opt => String(opt.value) === String(value))
            || (allowRawValueLabel && value ? { value, label: String(value) } : null));

    const handleChange = (selected) => {
        if (isMultiSelect) {
            onChange?.((selected || []).map(opt => opt.value));
            return;
        }

        onChange?.(selected?.value || '');
    };

    const CheckboxOption = (optionProps) => (
        <ReactSelectComponents.Option {...optionProps}>
            <div className="flex items-center gap-2">
                <input type="checkbox" checked={optionProps.isSelected} readOnly className="h-3 w-3" />
                <span>{optionProps.label}</span>
            </div>
        </ReactSelectComponents.Option>
    );

    const MultiSelectMenuList = (menuProps) => {
        const allOptions = menuProps.selectProps.options ?? [];
        const selectedOptions = menuProps.selectProps.value ?? [];
        const isAllSelected = allOptions.length > 0 && selectedOptions.length === allOptions.length;

        const toggleAll = () => {
            menuProps.selectProps.onChange?.(isAllSelected ? [] : allOptions);
        };

        return (
            <ReactSelectComponents.MenuList {...menuProps}>
                {allOptions.length > 0 && (
                    <button
                        type="button"
                        aria-pressed={isAllSelected}
                        onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                        }}
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            toggleAll();
                        }}
                        className="flex w-full items-center gap-2 border-b border-gray-200 px-3 py-2 text-left text-gray-800 hover:bg-gray-100"
                    >
                        <input type="checkbox" checked={isAllSelected} readOnly className="h-3 w-3" />
                        <span>Alla</span>
                    </button>
                )}
                {menuProps.children}
            </ReactSelectComponents.MenuList>
        );
    };

    const MultiValue = (multiValueProps) => {
        const selectedOptions = multiValueProps.getValue();
        const allOptions = multiValueProps.selectProps.options ?? [];
        const isAllSelected = allOptions.length > 0 && selectedOptions.length === allOptions.length;

        if (isAllSelected || selectedOptions.length >= 2) {
            return multiValueProps.index === 0
                ? <span className="text-gray-700">{isAllSelected ? 'Alla valda' : `${selectedOptions.length} valda`}</span>
                : null;
        }

        return <ReactSelectComponents.MultiValue {...multiValueProps} />;
    };

    const IndicatorsContainer = (containerProps) => (
        <ReactSelectComponents.IndicatorsContainer {...containerProps}>
            {openInNewTabUrl ? (
                <button
                    type="button"
                    onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                    }}
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        window.open(openInNewTabUrl, '_blank', 'noopener,noreferrer');
                    }}
                    aria-label={openInNewTabLabel}
                    title={openInNewTabLabel}
                    className="inline-flex h-5 w-5 items-center justify-center text-gray-500 hover:text-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-700"
                >
                    <ExternalLink size={14} aria-hidden="true" />
                </button>
            ) : null}
            {containerProps.children}
        </ReactSelectComponents.IndicatorsContainer>
    );

    const DropdownIndicator = (indicatorProps) => (
        <ReactSelectComponents.DropdownIndicator {...indicatorProps}>
            <ChevronDown
                aria-hidden="true"
                className={`pointer-events-none h-4 w-4 transition-colors ${indicatorProps.isDisabled
                    ? 'text-gray-400'
                    : 'text-[#a9a9a9] group-hover:text-black'}`}
            />
        </ReactSelectComponents.DropdownIndicator>
    );

    const customStyles = {
        menu: (provided) => ({
            ...provided,
            ...(fitMenuToContent ? {
                width: 'max-content',
                minWidth: '100%',
                maxWidth: 'calc(100vw - 2rem)',
            } : {}),
        }),
        option: (provided) => ({
            ...provided,
            ...(fitMenuToContent ? {
                whiteSpace: 'nowrap',
            } : {}),
        }),
        control: (provided, state) => ({
            ...provided,
            minHeight: filterStyle ? 26 : 24,
            height: isMultiSelect ? 'auto' : filterStyle ? 26 : 24,
            borderColor: filterStyle ? '#65a30d' : '#ccc',
            borderRadius: filterStyle ? 9999 : provided.borderRadius,
            boxShadow: 'none',
            backgroundColor: state.isDisabled ? 'transparent' : '#fff',
            cursor: state.isDisabled ? 'not-allowed' : 'default',
        }),
        valueContainer: (provided) => ({
            ...provided,
            minHeight: 25,
            padding: filterStyle ? '1px 4px 0px 10px' : '0px 4px 1px 6px',
        }),
        input: (provided) => ({
            ...provided,
            margin: 0,
            padding: 0,
        }),
        indicatorsContainer: (provided) => ({
            ...provided,
            height: 25,
        }),
        singleValue: (provided, state) => ({
            ...provided,
            color: state.isDisabled ? '#374151' : provided.color,
        }),
        multiValue: (provided) => ({
            ...provided,
            marginTop: 1,
            marginBottom: 1,
        }),
        clearIndicator: (provided) => ({
            ...provided,
            padding: 0,
            color: 'orange',
            cursor: 'auto',
            '&:hover': { color: 'orange' },
        }),
        dropdownIndicator: (provided) => ({
            ...provided,
            padding: 0,
            color: 'darkgray',
            cursor: 'auto',
            '&:hover': { color: '#000' },
            margin: filterStyle ? '0 6px 0 0' : '0 3px 0 0',
        }),
        indicatorSeparator: () => ({
            display: 'none',
        }),
    };

    return (
        <div className={`flex items-center w-full pb-[1px] mt-${margintop}`}>
            <label className={`${labelWidth || ''} flex-none text-xs text-gray-700`}>{label}</label>
            <Select
                options={options}
                value={selectedValue}
                onChange={handleChange}
                name={name}
                className={`group text-xs ${inputWidth || 'w-full'}`}
                placeholder="Välj"
                formatOptionLabel={optionCategoryKey
                    ? (option, { context }) => context === 'menu' ? (
                        <span
                            className={`grid gap-3 ${fitMenuToContent ? 'grid-cols-[max-content_max-content]' : 'grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]'}`}
                            style={optionCategoryWidth ? {
                                gridTemplateColumns: `${optionCategoryWidth} ${fitMenuToContent ? 'max-content' : 'minmax(0, 1.2fr)'}`,
                            } : undefined}
                        >
                            <span className={fitMenuToContent && !optionCategoryWidth ? '' : 'truncate'}>{option.category}</span>
                            <span className={fitMenuToContent ? '' : 'truncate'}>{option.label}</span>
                        </span>
                    ) : option.label
                    : undefined}
                isClearable
                isSearchable
                isDisabled={disabled}
                styles={customStyles}
                {...props}
                closeMenuOnSelect={!isMultiSelect}
                blurInputOnSelect={!isMultiSelect}
                hideSelectedOptions={false}
                components={{
                    ...(isMultiSelect ? { Option: CheckboxOption } : {}),
                    ...(isMultiSelect ? { MenuList: MultiSelectMenuList } : {}),
                    ...(isMultiSelect ? { MultiValue } : {}),
                    ...(openInNewTabUrl ? { IndicatorsContainer } : {}),
                    DropdownIndicator,
                }}
            />
        </div>
    );
};

export default LabeledReactSelect;
