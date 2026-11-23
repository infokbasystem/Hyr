import { Check, House } from 'lucide-react'

export default function PlanningItemCurrentStatus({ status }) {
    if (status !== 2 && status !== 3) return null

    const isCheckedIn = status === 3
    const label = isCheckedIn ? 'Hemma, incheckad' : 'Hemma, ej incheckad'

    return (
        <span
            role="img"
            aria-label={label}
            title={label}
            style={{
                position: 'relative',
                display: 'inline-flex',
                color: isCheckedIn ? '#16a34a' : '#d97706',
                flexShrink: 0,
            }}
        >
            <House size={14} strokeWidth={2} />
            {isCheckedIn && (
                <Check
                    size={8}
                    strokeWidth={3}
                    style={{
                        position: 'absolute',
                        right: -2,
                        bottom: -2,
                        background: '#d4defc',
                        borderRadius: '50%',
                    }}
                />
            )}
        </span>
    )
}
