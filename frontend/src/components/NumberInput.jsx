import React, { useState, useEffect } from "react";

const NumberInput = ({
    rowId,
    field,
    value,
    disabled = false,
    decimals = 2,
    stylePreset = 'default',
    gridcell = false,
    className,
    onChange,
    ...props
}) => {
    const [displayValue, setDisplayValue] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const isGridCell = stylePreset === 'gridCell' || gridcell

    const baseClassName = isGridCell
        ? 'block h-full w-full border border-transparent bg-transparent px-3 pt-[6px] pb-[3px] text-right text-xs text-gray-800 outline-none transition focus:bg-white focus:ring-0 focus:shadow-[inset_0_0_0_1px_#60a5fa]'
        : 'text-right px-2 py-1 focus:outline-none'

    // Format number for display when blurred
    const formatNumber = (num) => {
        if (num == null || num === "") return "";
        const parts = num.toFixed(decimals).split(".");
        let intPart = parts[0];
        let decPart = parts[1];
        // Add space as thousand separator
        intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
        return decimals > 0 ? `${intPart},${decPart}` : intPart;
    };

    // Prepare number for editing (Swedish comma but no spaces)
    const formatForEdit = (num) => {
        if (num == null || num === "") return "";
        return decimals > 0
            ? num.toFixed(decimals).replace(".", ",")
            : Math.round(num).toString();
    };

    // Sync when external value changes
    useEffect(() => {
        if (!isFocused) {
            setDisplayValue(formatNumber(value));
        }
    }, [value, isFocused]);

    const handleFocus = () => {
        setIsFocused(true);
        setDisplayValue(formatForEdit(value));
    };

    const handleBlur = () => {
        setIsFocused(false);

        // If input is empty, set to null
        if (displayValue === "" || displayValue == null) {
            onChange(rowId, field, null);
            setDisplayValue("");
            return;
        }

        // Parse and format again for display
        const parsed = parseInput(displayValue);
        if (!isNaN(parsed)) {
            onChange(rowId, field, parsed);
            setDisplayValue(formatNumber(parsed));
        } else {
            setDisplayValue(formatNumber(value));
        }
    };

    const parseInput = (str) => {
        if (typeof str !== "string") return NaN;
        // Replace comma with dot, remove spaces
        const normalized = str.replace(/\s+/g, "").replace(",", ".");
        return parseFloat(normalized);
    };

    const handleChange = (e) => {
        let newVal = e.target.value;

        // Only allow digits, comma, and spaces while typing
        newVal = newVal.replace(/[^\d,]/g, "");

        // Prevent decimals if decimals = 0
        if (decimals === 0) {
            newVal = newVal.replace(/,.*$/, "");
        }

        setDisplayValue(newVal);

        const parsed = parseInput(newVal);
        if (!isNaN(parsed)) onChange(rowId, field, parsed);
    };

    return (
        <input
            type="text"
            value={displayValue}
            disabled={disabled}
            autoComplete="off"
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            className={`${baseClassName} ${className ?? ''}`.trim()}
            {...props}
        />
    );
};

export default NumberInput;
