import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SegmentedFilter from "../../components/SegmentedFilter";
import { getPlanningItemTypes } from "../../lib/planningApi";
import VehicleTimeline from "./VehicleTimeline";
import CabinTimeline from "./CabinTimeline";
import LiftTimeline from "./LiftTimeline";
import CustomerOverview from "./CustomerOverview";
import PlanningSkeleton from "./PlanningSkeleton";
import { useDelayedSkeleton } from "../../hooks/useDelayedSkeleton";
import { getOfficeItemTypeSettings } from "../../lib/officeApi";
import { getSharedRequest } from "../../lib/sharedRequest";

const PLANNING_VIEWS = {
  VEHICLE: VehicleTimeline,
  CABIN: CabinTimeline,
  LIFT: LiftTimeline,
  CUSTOMER: CustomerOverview,
};

const PLANNING_TYPE_ORDER = ['VEHICLE', 'CABIN', 'LIFT'];

const Overview = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [planningTypes, setPlanningTypes] = useState(null);
  const [isDragLockLoading, setIsDragLockLoading] = useState(true);
  const [lockPlanningTimelineDrag, setLockPlanningTimelineDrag] = useState(true);
  const [settingsError, setSettingsError] = useState("");
  const showLoadingSkeleton = useDelayedSkeleton(planningTypes === null || isDragLockLoading, 200);

  useEffect(() => {
    let isActive = true;

    getPlanningItemTypes()
      .then((itemTypes) => {
        if (!isActive) return;
        const available = itemTypes
          .filter((itemType) => PLANNING_TYPE_ORDER.includes(itemType.code))
          .sort((a, b) => PLANNING_TYPE_ORDER.indexOf(a.code) - PLANNING_TYPE_ORDER.indexOf(b.code));
        setPlanningTypes(available);
      })
      .catch(() => {
        if (isActive) setPlanningTypes([]);
      });

    return () => { isActive = false; };
  }, []);

  useEffect(() => {
    let isActive = true;

    getSharedRequest("office:item-type-settings", () => getOfficeItemTypeSettings())
      .then((settings) => {
        if (isActive) {
          setLockPlanningTimelineDrag(Boolean(settings?.lockPlanningTimelineDrag));
        }
      })
      .catch((error) => {
        if (isActive) {
          setSettingsError(error?.payload?.message ?? error?.message ?? "Kontorsinställningen för planering kunde inte hämtas.");
        }
      })
      .finally(() => {
        if (isActive) setIsDragLockLoading(false);
      });

    return () => { isActive = false; };
  }, []);

  if (planningTypes === null || isDragLockLoading) {
    return (
      <div className="h-full min-w-0 px-4 pt-20" aria-busy="true">
        {showLoadingSkeleton && <PlanningSkeleton />}
      </div>
    );
  }

  const viewOptions = [{ code: 'CUSTOMER', name: 'Kund' }, ...planningTypes];
  const requestedType = String(searchParams.get('type') ?? '').trim().toUpperCase();
  const selectedType = viewOptions.some((itemType) => itemType.code === requestedType)
    ? requestedType
    : planningTypes[0]?.code ?? 'VEHICLE';

  const handleTypeChange = (code) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set('type', code);
      return next;
    }, { replace: true });
  };

  const typeSelector = (
    <SegmentedFilter
      value={selectedType}
      onChange={handleTypeChange}
      options={viewOptions.map((itemType) => ({
        value: itemType.code,
        label: itemType.code === 'CABIN' ? 'Bod' : itemType.name,
      }))}
      theme="green"
    />
  );

  const Timeline = PLANNING_VIEWS[selectedType] ?? VehicleTimeline;

  return (
    <div className="relative flex flex-col h-full w-full min-w-0">
      {settingsError && (
        <div role="alert" className="mx-4 mt-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {settingsError} Bokningar är låsta tills inställningen kan hämtas.
        </div>
      )}
      <Timeline
        key={selectedType}
        typeSelector={typeSelector}
        lockPlanningTimelineDrag={lockPlanningTimelineDrag}
      />
    </div>
  );
}

export default Overview