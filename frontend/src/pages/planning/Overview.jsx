import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SegmentedFilter from "../../components/SegmentedFilter";
import { getPlanningItemTypes } from "../../lib/planningApi";
import VehicleTimeline from "./VehicleTimeline";
import CabinTimeline from "./CabinTimeline";

const PLANNING_VIEWS = {
  VEHICLE: VehicleTimeline,
  CABIN: CabinTimeline,
};

const PLANNING_TYPE_ORDER = ['VEHICLE', 'CABIN'];

const Overview = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [planningTypes, setPlanningTypes] = useState(null);

  useEffect(() => {
    let isActive = true;

    getPlanningItemTypes()
      .then((itemTypes) => {
        if (!isActive) return;
        const available = itemTypes
          .filter((itemType) => PLANNING_VIEWS[itemType.code])
          .sort((a, b) => PLANNING_TYPE_ORDER.indexOf(a.code) - PLANNING_TYPE_ORDER.indexOf(b.code));
        setPlanningTypes(available);
      })
      .catch(() => {
        if (isActive) setPlanningTypes([]);
      });

    return () => { isActive = false; };
  }, []);

  if (planningTypes === null) {
    return null;
  }

  const requestedType = String(searchParams.get('type') ?? '').trim().toUpperCase();
  const selectedType = planningTypes.some((itemType) => itemType.code === requestedType)
    ? requestedType
    : planningTypes[0]?.code ?? 'VEHICLE';

  const handleTypeChange = (code) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set('type', code);
      return next;
    }, { replace: true });
  };

  const typeSelector = planningTypes.length > 1 ? (
    <SegmentedFilter
      value={selectedType}
      onChange={handleTypeChange}
      options={planningTypes.map((itemType) => ({ value: itemType.code, label: itemType.name }))}
      theme="green"
    />
  ) : null;

  const Timeline = PLANNING_VIEWS[selectedType] ?? VehicleTimeline;

  return (
    <div className="relative flex flex-col h-full w-full">
      <Timeline key={selectedType} typeSelector={typeSelector} />
    </div>
  );
}

export default Overview