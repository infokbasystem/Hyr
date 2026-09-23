const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_PREFIX_PATTERN = /^(\d{4}-\d{2}-\d{2})(?:[T\s].*)?$/;
const SWEDISH_DATE_PATTERN = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/;

const pad2 = (value) => String(value).padStart(2, '0');

const formatDateInputValue = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return '';
    }

    const year = date.getFullYear();
    const month = pad2(date.getMonth() + 1);
    const day = pad2(date.getDate());
    return `${year}-${month}-${day}`;
};

export const toSwedishDateInputValue = (value) => {
    if (!value) {
        return '';
    }

    if (value instanceof Date) {
        return formatDateInputValue(value);
    }

    const rawValue = String(value).trim();
    if (!rawValue) {
        return '';
    }

    if (DATE_INPUT_PATTERN.test(rawValue)) {
        return rawValue;
    }

    const dateTimePrefixMatch = rawValue.match(DATE_TIME_PREFIX_PATTERN);
    if (dateTimePrefixMatch) {
        return dateTimePrefixMatch[1];
    }

    const swedishDateMatch = rawValue.match(SWEDISH_DATE_PATTERN);
    if (swedishDateMatch) {
        const [, day, month, year] = swedishDateMatch;
        return `${year}-${pad2(month)}-${pad2(day)}`;
    }

    const parsedDate = new Date(rawValue);
    return formatDateInputValue(parsedDate);
};

export const fromDateInputToSwedishIso = (value) => {
    const datePart = toSwedishDateInputValue(value);
    if (!datePart) {
        return '';
    }

    return `${datePart}T00:00:00`;
};

export const formatDateShort = (value) => {
    const datePart = toSwedishDateInputValue(value);
    if (!datePart) {
        return '';
    }

    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) {
        return '';
    }

    return new Intl.DateTimeFormat('sv-SE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date(year, month - 1, day));
};

export const normalizeApiUtcDate = (value) => {
    if (!value) {
        return null;
    }
    if (value instanceof Date) {
        return value;
    }
    const str = String(value).trim();
    if (!str) {
        return null;
    }
    // If it doesn't end with Z or have offset, normalize as UTC
    if (!str.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(str)) {
        return new Date(`${str}Z`);
    }
    return new Date(str);
};

export const formatApiDateToSwedish = (value) => {
    const date = normalizeApiUtcDate(value);
    if (!date || Number.isNaN(date.getTime())) {
        return '';
    }
    return new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Stockholm',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
};

export const formatApiDateTimeToSwedish = (value) => {
    const date = normalizeApiUtcDate(value);
    if (!date || Number.isNaN(date.getTime())) {
        return '';
    }
    return new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Stockholm',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

