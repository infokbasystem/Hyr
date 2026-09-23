import React, { useId } from "react";
import { Gauge as GaugeIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Reusable Gauge Component
// - 240° symmetrical arc (from 210° down-left to -30° down-right)
// - Gradient track: Red -> Orange -> Yellow -> Green with rounded caps
// - Dark slate/navy background track
// - Sleek needle with center pivot
// - Center value readout + min/max + delta comparison
// ---------------------------------------------------------------------------

const GAUGE_SWEEP = 240; // Total sweep in degrees
const START_ANGLE_DEG = 210;
const END_ANGLE_DEG = -30;

function polarToCartesian(cx, cy, r, angleInDegrees) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy - r * Math.sin(angleInRadians),
  };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = Math.abs(startAngle - endAngle) >= 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

export default function Gauge({
  id: explicitId,
  title,
  value = 0,
  min = 0,
  max = 100,
  unit = "%",
  decimals = 1,
  caption,
  deltaLabel,
  deltaPositive,
  showNeedle = false,
  colorDirection = "goodHigh", // "goodHigh": red->yellow->green. "goodLow": green->yellow->red.
  size = 200,
  className = "",
}) {
  const autoId = useId().replace(/:/g, "_");
  const id = explicitId || autoId;

  const clampedValue = Math.max(min, Math.min(max, value));
  const range = max - min || 1;
  const pct = Math.max(0, Math.min(100, ((clampedValue - min) / range) * 100));

  // Needle angle: -120deg at 0%, 0deg at 50%, +120deg at 100%
  const needleRotation = (pct / 100 - 0.5) * GAUGE_SWEEP;

  // Geometry calculations
  const cx = 100;
  const cy = 95;
  const radius = 72;
  const strokeWidth = 15;

  const totalArcLength = (radius * GAUGE_SWEEP * Math.PI) / 180;
  const progressLength = (pct / 100) * totalArcLength;

  const arcPath = describeArc(cx, cy, radius, START_ANGLE_DEG, END_ANGLE_DEG);

  // Colors for gradient matching the reference image
  const stops =
    colorDirection === "goodHigh"
      ? [
          { offset: "0%", color: "#df5645" },   // Red / Coral
          { offset: "22%", color: "#eb8b38" },  // Orange
          { offset: "48%", color: "#eebc3b" },  // Yellow
          { offset: "78%", color: "#84cf5c" },  // Light Green
          { offset: "100%", color: "#54cc68" }, // Green
        ]
      : [
          { offset: "0%", color: "#54cc68" },
          { offset: "22%", color: "#84cf5c" },
          { offset: "48%", color: "#eebc3b" },
          { offset: "78%", color: "#eb8b38" },
          { offset: "100%", color: "#df5645" },
        ];

  const gradId = `gaugeGrad-${id}`;
  const formattedValue = clampedValue.toFixed(decimals).replace(".", ",");

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* Title */}
      {title && (
        <div className="mb-0 flex items-center gap-1.5">
          {/* <GaugeIcon size={14} className="text-stone-500" strokeWidth={2} /> */}
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
            {title}
          </span>
        </div>
      )}

      {/* SVG Arc and Needle */}
      <div className="relative" style={{ width: size, height: size * 0.78 }}>
        <svg
          viewBox="0 0 200 160"
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="70%" x2="100%" y2="70%">
              {stops.map((stop, idx) => (
                <stop
                  key={idx}
                  offset={stop.offset}
                  stopColor={stop.color}
                />
              ))}
            </linearGradient>
          </defs>

          {/* Dark Background Track */}
          <path
            d={arcPath}
            fill="none"
            stroke="#1f242d"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Active Gradient Filled Arc */}
          {pct > 0 && (
            <path
              d={arcPath}
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${progressLength} ${totalArcLength}`}
              strokeDashoffset="0"
              style={{
                transition: "stroke-dasharray 0.5s ease-out",
              }}
            />
          )}

          {/* Needle pointer (optional, hidden by default) */}
          {showNeedle && (
            <g
              transform={`translate(${cx}, ${cy}) rotate(${needleRotation})`}
              style={{ transition: "transform 0.5s ease-out" }}
            >
              {/* Tapered needle */}
              <path
                d="M -2.5 0 L -0.7 -48 L 0.7 -48 L 2.5 0 Z"
                fill="#374151"
              />
              {/* Center Pivot */}
              <circle cx="0" cy="0" r="6" fill="#374151" />
              <circle cx="0" cy="0" r="2.5" fill="#1f2937" />
            </g>
          )}

          {/* Min & Max labels */}
          <text
            x="24"
            y="150"
            textAnchor="middle"
            className="fill-stone-400 text-[11px] font-medium"
          >
            {min}
          </text>
          <text
            x="176"
            y="150"
            textAnchor="middle"
            className="fill-stone-400 text-[11px] font-medium"
          >
            {max}
          </text>
        </svg>

        {/* Center Readout (number + unit below pivot) */}
        <div className="absolute inset-x-0 top-[52%] flex flex-col items-center pointer-events-none">
          <span className="text-[28px] font-black leading-none tracking-tight text-stone-900">
            {formattedValue}
          </span>
          {unit && (
            <span className="mt-1 text-[10px] font-medium text-stone-400 tracking-wider">
              {unit}
            </span>
          )}
        </div>
      </div>

      {/* Delta & Trend footer */}
      {(deltaLabel || formattedValue) && (
        <div className="mt-1 flex items-center gap-1.5 text-xs text-stone-700">
          <span className="font-medium">
            {formattedValue}
            {unit ? ` ${unit}` : ""}
          </span>
          {deltaLabel && (
            <>
              <span className="text-stone-300">·</span>
              <span
                className={
                  deltaPositive === true
                    ? "font-semibold text-emerald-600"
                    : deltaPositive === false
                      ? "font-semibold text-rose-600"
                      : "text-stone-600"
                }
              >
                {deltaLabel}
              </span>
            </>
          )}
        </div>
      )}

      {caption && (
        <span className="mt-0.5 max-w-[200px] truncate text-[10px] text-stone-400">
          {caption}
        </span>
      )}
    </div>
  );
}
