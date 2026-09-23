import LabeledDatePicker from '../../components/LabeledDatePicker';
import TimeDropdownInput from '../../components/TimeDropdownInput';

const DEFAULT_TIME = '00:00';
const DATE_TIME_PATTERN = /^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2}))?/;
const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const normalizeTimeOfDay = (value) => {
    const trimmedValue = String(value ?? '').trim();
    return TIME_OF_DAY_PATTERN.test(trimmedValue) ? trimmedValue : '';
};

const getTodayDatePart = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const splitDateTimeValue = (value) => {
    const trimmedValue = String(value ?? '').trim();
    if (!trimmedValue) {
        return { datePart: '', timePart: '' };
    }

    const match = trimmedValue.match(DATE_TIME_PATTERN);
    if (!match) {
        return { datePart: '', timePart: '' };
    }

    return {
        datePart: match[1] || '',
        timePart: match[2] || '',
    };
};

const buildDateTimeValue = (datePart, timePart) => {
    if (!datePart) {
        return '';
    }

    return `${datePart}T${timePart || DEFAULT_TIME}`;
};

const roundTimeToNearestQuarterHour = (value = new Date()) => {
    const reference = new Date(value);
    const totalMinutes = reference.getHours() * 60 + reference.getMinutes();
    const roundedTotalMinutes = Math.round(totalMinutes / 15) * 15;
    const wrappedMinutes = ((roundedTotalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
    const hours = Math.floor(wrappedMinutes / 60);
    const minutes = wrappedMinutes % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const ReservationItemDateTimeFields = ({ item, onFieldChange, defaultBookedFromTime = '', defaultBookedToTime = '' }) => {
    const resolveDefaultTimeOfDay = (field) => {
        if (field === 'bookedFrom') {
            return normalizeTimeOfDay(defaultBookedFromTime);
        }

        if (field === 'bookedTo') {
            return normalizeTimeOfDay(defaultBookedToTime);
        }

        return '';
    };

    const handleDateChange = (field, nextDatePart) => {
        const nextDate = String(nextDatePart ?? '').trim();
        if (!nextDate) {
            onFieldChange(field, '');
            return;
        }

        const currentValue = splitDateTimeValue(item?.[field]);
        const hasExistingTime = Boolean(currentValue.timePart);
        const nextTimePart = field === 'actualFrom' || field === 'actualTo'
            ? (hasExistingTime ? currentValue.timePart : roundTimeToNearestQuarterHour())
            : currentValue.timePart || resolveDefaultTimeOfDay(field) || DEFAULT_TIME;

        onFieldChange(field, buildDateTimeValue(nextDate, nextTimePart));
    };

    const handleTimeChange = (field, nextTimePart) => {
        const nextTime = String(nextTimePart ?? '').trim();
        if (!nextTime) {
            return;
        }

        const currentValue = splitDateTimeValue(item?.[field]);
        const datePart = currentValue.datePart || getTodayDatePart();
        onFieldChange(field, buildDateTimeValue(datePart, nextTime));
    };

    const bookedFrom = splitDateTimeValue(item?.bookedFrom);
    const actualFrom = splitDateTimeValue(item?.actualFrom);
    const bookedTo = splitDateTimeValue(item?.bookedTo);
    const actualTo = splitDateTimeValue(item?.actualTo);

    return (
        <>
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                    <LabeledDatePicker
                        label="Bokad från"
                        value={bookedFrom.datePart}
                        onChange={(value) => handleDateChange('bookedFrom', value)}
                        valueType="input"
                        labelWidth="w-20"
                        inputWidth="w-[88px]"
                        margintop="0"
                        placeholder="Datum"
                    />
                    <TimeDropdownInput
                        value={bookedFrom.timePart}
                        onChange={(value) => handleTimeChange('bookedFrom', value)}
                    />
                </div>
                <div className="flex items-center gap-1">
                    <LabeledDatePicker
                        label="Utlämnad"
                        value={actualFrom.datePart}
                        onChange={(value) => handleDateChange('actualFrom', value)}
                        valueType="input"
                        labelWidth="w-[74px]"
                        inputWidth="w-[88px]"
                        margintop="0"
                        placeholder="Datum"
                    />
                    <TimeDropdownInput
                        value={actualFrom.timePart}
                        onChange={(value) => handleTimeChange('actualFrom', value)}
                    />
                </div>
            </div>
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                    <LabeledDatePicker
                        label="Bokad till"
                        value={bookedTo.datePart}
                        onChange={(value) => handleDateChange('bookedTo', value)}
                        valueType="input"
                        labelWidth="w-20"
                        inputWidth="w-[88px]"
                        margintop="0"
                        placeholder="Datum"
                    />
                    <TimeDropdownInput
                        value={bookedTo.timePart}
                        onChange={(value) => handleTimeChange('bookedTo', value)}
                    />
                </div>
                <div className="flex items-center gap-1">
                    <LabeledDatePicker
                        label="Återlämnad"
                        value={actualTo.datePart}
                        onChange={(value) => handleDateChange('actualTo', value)}
                        valueType="input"
                        labelWidth="w-[74px]"
                        inputWidth="w-[88px]"
                        margintop="0"
                        placeholder="Datum"
                    />
                    <TimeDropdownInput
                        value={actualTo.timePart}
                        onChange={(value) => handleTimeChange('actualTo', value)}
                    />
                </div>
            </div>
        </>
    );
};

export default ReservationItemDateTimeFields;
