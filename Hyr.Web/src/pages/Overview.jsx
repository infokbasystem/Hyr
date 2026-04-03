import React, { useState } from "react";
import VehicleTimeline from "./operations/VehicleTimeline";

const Overview = () => {
  const [carSearchParams, setCarSearchParams] = useState(null);

  const handleCarSearch = (params) => {
    setCarSearchParams(params);
    // Optionally trigger search logic here
  };




  return (
    <div className="relative flex flex-col h-full w-full">

          {/* <VehicleTimeline /> */}

      <div className="grid grid-cols-[1fr_0px]">
        <span>
          <VehicleTimeline onCarSearch={handleCarSearch} />
        </span>
        {/* <span>          
          // Visa sökparametrar när de är tillgängliga
          {carSearchParams && (
            <div style={{ padding: 16, background: '#f4f4f4', borderRadius: 8 }}>
              <div><strong>Sökparametrar:</strong></div>
              <div>Period: {carSearchParams.period.from} - {carSearchParams.period.to}</div>
              <div>Kategori: {carSearchParams.category || 'Alla'}</div>
              <div>Modell: {carSearchParams.model || 'Alla'}</div>
            </div>
          )}
        </span> */}
      </div>

    </div>
  )

}

export default Overview