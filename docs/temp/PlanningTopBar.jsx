import React from 'react';
import { Plus, Minus, Search, Hand, List } from 'lucide-react';
import ActionButton from '../../../components/ActionButton';
import SearchWorkorder from '../../../components/SearchWorkorder';
import MinimapCalendarPlaceholder from './MinimapCalendarPlaceholder';
import MiniCalendarPlaceholder from './MiniCalendarPlaceholder';

export default function PlanningTopBar({
    anchorDate,
    onSelectDate,
    dayStart,
    dayEnd,
    onZoomIn,
    onZoomOut,
    onToggleBacklog,
    showBacklog,
    onNewWorkorder,
    onWorkorderSelect,
    onDragStartWorkorder,
    selectedWorkorder,
}) {
    return (
        <div className="flex items-stretch gap-2.5 py-5 shrink-0 min-w-0 select-none">
            {/* Left Action & Filter Controls */}
            <div className="flex flex-col w-72 shrink-0 text-xs my-3 px-4">
                {/* Top button row */}
                <div className="flex items-center gap-1.5 ms-1">
                    <ActionButton
                        label="Ny arbetsorder"
                        icon={Plus}
                        onClick={onNewWorkorder}
                        accent='lime'
                    />
                </div>

                {/* Välj Ao Search row */}
                <div className="flex items-center gap-1 mt-2">
                    <SearchWorkorder
                        onWorkorderSelect={onWorkorderSelect}
                        selectedWorkorder={selectedWorkorder}
                        placeholder="Sök Ao"
                        showStatusFilter
                        width="flex-1"
                    />
                    <button
                        type="button"
                        draggable={Boolean(selectedWorkorder)}
                        onDragStart={(event) => onDragStartWorkorder?.(event, selectedWorkorder)}
                        disabled={!selectedWorkorder}
                        className={`inline-flex shrink-0 items-center gap-1 rounded-xl border px-1.5 py-1 text-[9px] font-bold uppercase tracking-tight shadow-2xs transition enabled:cursor-grab enabled:active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50 ${selectedWorkorder
                            ? 'border-lime-500 bg-lime-100 text-lime-800 enabled:hover:bg-lime-200'
                            : 'border-none text-slate-400'
                            }`}
                        title={selectedWorkorder ? 'Dra till planering' : 'Välj en arbetsorder först'}
                    >
                        <Hand className="h-4 w-4" />
                        <span>Dra</span>
                    </button>
                </div>

                {/* Zoom / Visible Day Range */}
                <div className="flex flex-row justify-between gap-2 mt-4 ms-1">
                    <div className="flex items-center gap-1.5 text-tiny text-slate-600 font-medium">
                        <div className="flex items-center border border-slate-300 rounded bg-white overflow-hidden shadow-2xs">
                            <button
                                type="button"
                                onClick={onZoomOut}
                                className="px-1.5 py-0.5 hover:bg-slate-100 text-slate-700 border-r border-slate-200"
                                title="Visa fler timmar"
                            >
                                <Minus className="w-3 h-3" />
                            </button>
                            <button
                                type="button"
                                onClick={onZoomIn}
                                className="px-1.5 py-0.5 hover:bg-slate-100 text-slate-700"
                                title="Visa färre timmar"
                            >
                                <Plus className="w-3 h-3" />
                            </button>
                        </div>
                        <span className="uppercase text-[10px] tracking-tight font-semibold text-slate-600">
                            Visad del av dag
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onToggleBacklog}
                        aria-label={showBacklog ? 'Dölj kö' : 'Visa kö'}
                        title={showBacklog ? 'Dölj kö' : 'Visa kö'}
                        className={`inline-flex shrink-0 items-center gap-1 rounded-xl border px-1.5 py-1 text-[9px] font-bold uppercase tracking-tight shadow-2xs transition-colors ${
                            showBacklog
                                ? 'border-lime-500 bg-lime-100 text-lime-800 hover:bg-lime-200'
                                : 'border-lime-500  text-slate-400 hover:bg-slate-50'
                        }`}
                    >
                        <List className="h-4 w-4" aria-hidden="true" />
                        <span>{showBacklog ? 'Dölj kö' : 'Visa kö'}</span>
                    </button>
                </div>

                {/* Däckskifte search row & toggle queue */}
                {/* <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 flex-1">
            <span className="w-16 text-[10px] font-semibold text-slate-600">Däckskifte</span>
            <div className="relative flex-1 flex items-center">
              <input
                type="text"
                placeholder="Regnr"
                className="w-full bg-white border border-slate-300 rounded-l px-1.5 py-0.5 text-[11px] focus:outline-none focus:border-blue-500 placeholder:text-slate-400"
              />
              <button
                type="button"
                className="bg-white border border-l-0 border-slate-300 rounded-r px-1 py-0.5 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                title="Sök däckskifte"
              >
                <Search className="w-3 h-3" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleBacklog}
            className={`px-1.5 py-0.5 border rounded text-[9px] font-bold uppercase transition-colors shrink-0 ${
              showBacklog
                ? 'bg-blue-600 text-white border-blue-700'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {showBacklog ? 'Dölj kö' : 'Visa kö'}
          </button>
        </div> */}

            </div>

            {/* Middle: Minimap Calendar Placeholder */}
            <MinimapCalendarPlaceholder
                anchorDate={anchorDate}
                onSelectDate={onSelectDate}
            />


            {/* Right: Mini Month Calendar Placeholder */}
            <div className="w-72 shrink-0">
                {/* <MiniCalendarPlaceholder
                    selectedDate={anchorDate}
                    onSelectDate={onSelectDate}
                /> */}
            </div>
        </div>
    );
}
