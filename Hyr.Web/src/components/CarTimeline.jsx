import React, { useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import './CarTimeline.css';

// Example props:
// cars = [{ id: 'car1', name: 'Volvo XC90' }, ...]
// reservations = [{ carId: 'car1', customer: 'Annika Knutson', start: '2026-02-21T08:00', end: '2026-02-21T14:00', code: 'CRA00M' }, ...]
// timeRange = { start: '2026-02-21T07:00', end: '2026-02-21T18:00' }


const ITEM_TYPE = 'RESERVATION';

function CarTimeline({ cars, reservations, timeRange, onReservationUpdate }) {
    // Calculate days for timeline
    const startDate = new Date(timeRange.start);
    const endDate = new Date(timeRange.end);
    const days = [];
    let current = new Date(startDate);
    while (current <= endDate) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }

    // Helper to get reservation block position/width (responsive to row width, days)
    const getBlockStyle = (res) => {
        let rowWidth = 0;
        if (typeof window !== 'undefined') {
            const row = document.querySelector('.reservations-row');
            if (row) rowWidth = row.offsetWidth;
        }
        if (!rowWidth) rowWidth = 700;
        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        const dayWidth = rowWidth / totalDays;
        const resStart = new Date(res.start);
        const resEnd = new Date(res.end);
        const left = Math.floor((resStart - startDate) / (1000 * 60 * 60 * 24)) * dayWidth;
        const width = Math.ceil((resEnd - resStart) / (1000 * 60 * 60 * 24)) * dayWidth || dayWidth;
        return {
            left: `${left}px`,
            width: `${width}px`,
            cursor: 'move',
        };
    };

    // Drag source for reservation block
    function ReservationBlock({ res, idx }) {
        const [{ isDragging }, drag] = useDrag({
            type: ITEM_TYPE,
            item: { ...res },
            collect: (monitor) => ({
                isDragging: monitor.isDragging(),
            }),
        });
        return (
            <div
                ref={drag}
                className="reservation-block"
                style={{ ...getBlockStyle(res), opacity: isDragging ? 0.5 : 1 }}
            >
                <div className="reservation-code">{res.code}</div>
                <div className="reservation-customer">{res.customer}</div>
            </div>
        );
    }


    // Drop target for the entire reservations-row (per car)
    function ReservationsRowDropZone({ carId, children }) {
        const rowRef = useRef(null);
        const [{ isOver }, drop] = useDrop({
            accept: ITEM_TYPE,
            drop: (item, monitor) => {
                const offset = monitor.getSourceClientOffset();
                const boundingRect = rowRef.current ? rowRef.current.getBoundingClientRect() : null;
                if (!offset || !boundingRect) return;
                // Calculate the day based on the horizontal drop position
                const x = offset.x - boundingRect.left;
                const totalWidth = boundingRect.width;
                const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                const dayWidth = totalWidth / totalDays;
                let dayOffset = Math.floor(x / dayWidth);
                if (dayOffset < 0) dayOffset = 0;
                if (dayOffset >= totalDays) dayOffset = totalDays - 1;
                // Calculate new start and end
                const durationDays = Math.ceil((new Date(item.end) - new Date(item.start)) / (1000 * 60 * 60 * 24)) || 1;
                const newStart = new Date(startDate);
                newStart.setDate(newStart.getDate() + dayOffset);
                newStart.setHours(0, 0, 0, 0);
                const newEnd = new Date(newStart);
                newEnd.setDate(newStart.getDate() + durationDays);
                if (onReservationUpdate) {
                    onReservationUpdate({
                        ...item,
                        carId,
                        start: newStart.toISOString(),
                        end: newEnd.toISOString(),
                    });
                }
            },
            canDrop: () => true,
            collect: (monitor) => ({
                isOver: monitor.isOver(),
            }),
        });
        drop(rowRef);
        return (
            <div ref={rowRef} className="reservations-row" style={isOver ? { background: '#e0e7ff' } : {}}>
                {children}
            </div>
        );
    }

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="car-timeline">
                <div className="timeline-header">
                    <div className="car-col-header"></div>
                    <div className="hours-row">
                        {days.map((d, idx) => (
                            <div className="hour-col" key={idx}>{d.toLocaleDateString()}</div>
                        ))}
                    </div>
                </div>
                <div className="timeline-body">
                    {cars.map((car) => (
                        <div className="car-row" key={car.id}>
                            <div className="car-col">{car.name}</div>
                            <ReservationsRowDropZone carId={car.id}>
                                {/* Render all reservation blocks for this car, absolutely positioned */}
                                {reservations.filter(r => r.carId === car.id).map((res, idx) => (
                                    <ReservationBlock key={idx} res={res} idx={idx} />
                                ))}
                            </ReservationsRowDropZone>
                        </div>
                    ))}
                </div>
            </div>
        </DndProvider>
    );
}

export default CarTimeline;
