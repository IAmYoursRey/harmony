import { Play, Square } from 'lucide-react';
import { DisasterType } from './types';

interface DisasterSimulationPanelProps {
  simRunning: boolean;
  selectedSim: DisasterType | null;
  onSelectSim: (type: DisasterType) => void;
  onToggleSim: () => void;
  hasMap: boolean;
  hasNodes: boolean;
}

export function DisasterSimulationPanel({
  simRunning,
  selectedSim,
  onSelectSim,
  onToggleSim,
  hasMap,
  hasNodes
}: DisasterSimulationPanelProps) {
  return (
    <div className="w-full bg-white dark:bg-slate-900 border-t border-brand-100 dark:border-slate-800 p-4 shadow-lg sticky bottom-0 z-10 flex flex-col sm:flex-row items-center gap-4">
      <div className="flex-1">
        <h3 className="font-display text-sm font-bold text-ink-900 dark:text-white">
          Disaster Simulation & Evacuation
        </h3>
        {!hasMap ? (
          <p className="text-xs text-red-500">Map is not uploaded.</p>
        ) : !hasNodes ? (
          <p className="text-xs text-amber-500">No nodes/routes created.</p>
        ) : (
          <p className="text-xs text-ink-500 dark:text-slate-400">
            Select a disaster scenario to activate the evacuation guidance system.
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto">
        <select
          value={selectedSim || ''}
          onChange={(e) => onSelectSim(e.target.value as DisasterType)}
          disabled={simRunning || !hasMap || !hasNodes}
          className="px-3 py-2 text-sm rounded-lg border border-brand-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex-1 sm:w-48"
        >
          <option value="">-- Scenario --</option>
          <option value="earthquake">Earthquake</option>
          <option value="fire">Fire</option>
          <option value="flood">Flood</option>
        </select>

        <button
          onClick={onToggleSim}
          disabled={!selectedSim || !hasMap || !hasNodes}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            simRunning
              ? 'bg-red-600 text-white hover:bg-red-700 shadow-[0_0_15px_rgba(220,38,38,0.5)]'
              : 'bg-brand-600 text-white hover:bg-brand-700 shadow-[0_0_15px_rgba(13,148,136,0.5)]'
          }`}
        >
          {simRunning ? (
            <>
              <Square className="h-4 w-4" fill="currentColor" /> STOP
            </>
          ) : (
            <>
              <Play className="h-4 w-4" fill="currentColor" /> START SIMULATION
            </>
          )}
        </button>
      </div>
    </div>
  );
}
