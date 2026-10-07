import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Orbit, 
  Thermometer, 
  Compass, 
  RotateCw, 
  Globe2, 
  BookOpen, 
  ExternalLink, 
  Sparkles,
  Info,
  Maximize2,
  ChevronRight,
  ShieldAlert,
  Layers
} from 'lucide-react';
import { 
  PLANETARY_CATALOG, 
  CELESTIAL_ORDER, 
  CelestialBodyData 
} from '@/data/planetaryCatalog';

interface CelestialInfoPanelProps {
  selectedBodyId: string;
  onSelectBody: (id: string) => void;
  onFocusTarget: (id: string) => void;
  onReturnToEarth: () => void;
  onClose: () => void;
}

export function CelestialInfoPanel({
  selectedBodyId,
  onSelectBody,
  onFocusTarget,
  onReturnToEarth,
  onClose
}: CelestialInfoPanelProps) {
  const [activeTab, setActiveTab] = useState<'metrics' | 'atmosphere' | 'interior' | 'missions'>('metrics');
  const [selectedLayerIdx, setSelectedLayerIdx] = useState<number | null>(null);
  const [hoveredLayerIdx, setHoveredLayerIdx] = useState<number | null>(null);
  const body: CelestialBodyData = PLANETARY_CATALOG[selectedBodyId] || PLANETARY_CATALOG['earth'];

  React.useEffect(() => {
    setSelectedLayerIdx(null);
    setHoveredLayerIdx(null);
  }, [selectedBodyId]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div 
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="fixed top-16 left-3 sm:left-4 z-[9999] w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-8.5rem)] flex flex-col bg-slate-950/90 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl text-slate-100 overflow-hidden animate-in fade-in slide-in-from-left-4 duration-300 pointer-events-auto"
      style={{
        boxShadow: `0 20px 50px rgba(0, 0, 0, 0.6), 0 0 25px ${body.visual.glowColor || 'rgba(56, 189, 248, 0.2)'}20`
      }}
    >
      {/* Top Gradient Border */}
      <div 
        className="h-1 w-full"
        style={{
          background: `linear-gradient(90deg, ${body.visual.color}, #38bdf8, transparent)`
        }}
      />

      {/* Header */}
      <div className="p-3.5 pb-2.5 border-b border-white/10 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-inner shrink-0"
            style={{ 
              background: `radial-gradient(circle at 35% 35%, #ffffff 0%, ${body.visual.color} 70%, #000000 100%)`,
              boxShadow: `0 0 15px ${body.visual.color}80`
            }}
          >
            {body.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-extrabold text-base text-white truncate tracking-wide">
                {body.name}
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                ({body.englishName})
              </span>
            </div>
            <p className="text-[11px] text-sky-400 font-medium truncate flex items-center gap-1">
              <Sparkles className="w-3 h-3 shrink-0" />
              {body.typeLabel}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup panel kosmik"
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Celestial Body Selector Pills */}
      <div className="px-3 py-2 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
        {CELESTIAL_ORDER.map((id) => {
          const item = PLANETARY_CATALOG[id];
          const isSelected = item.id === body.id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                onSelectBody(id);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-sky-500/25 border border-sky-400 text-sky-200 shadow-sm'
                  : 'bg-white/5 border border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/10'
              }`}
            >
              <span 
                className="w-2 h-2 rounded-full shrink-0" 
                style={{ backgroundColor: item.visual.color }}
              />
              <span>{item.name}</span>
            </button>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 bg-slate-900/60 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('metrics')}
          className={`flex-1 py-2 text-center border-b-2 transition-colors ${
            activeTab === 'metrics'
              ? 'border-sky-400 text-sky-300 bg-sky-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Metrik
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('atmosphere')}
          className={`flex-1 py-2 text-center border-b-2 transition-colors ${
            activeTab === 'atmosphere'
              ? 'border-sky-400 text-sky-300 bg-sky-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Atmosfer
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('interior')}
          className={`flex-1 py-2 text-center border-b-2 transition-colors flex items-center justify-center gap-1 ${
            activeTab === 'interior'
              ? 'border-sky-400 text-sky-300 bg-sky-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5 shrink-0" />
          <span>Interior</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('missions')}
          className={`flex-1 py-2 text-center border-b-2 transition-colors ${
            activeTab === 'missions'
              ? 'border-sky-400 text-sky-300 bg-sky-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Misi NASA
        </button>
      </div>

      {/* Scrollable Body Content */}
      <div className="p-3.5 space-y-3 overflow-y-auto no-scrollbar text-xs">
        {/* TAB 1: METRICS */}
        {activeTab === 'metrics' && (
          <div className="space-y-2.5 animate-in fade-in duration-200">
            {/* Quick Stat Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/5 border border-white/5 p-2 rounded-xl">
                <span className="text-[10px] text-slate-400 block">Jarak ke Matahari</span>
                <span className="font-bold text-white text-xs block">{body.distanceFromSunKm}</span>
                <span className="text-[10px] text-sky-400 font-mono">({body.distanceFromSunAU} AU)</span>
              </div>
              <div className="bg-white/5 border border-white/5 p-2 rounded-xl">
                <span className="text-[10px] text-slate-400 block">Diameter Khatulistiwa</span>
                <span className="font-bold text-white text-xs block">{body.diameterKm.toLocaleString()} km</span>
                <span className="text-[10px] text-sky-400 font-mono">({body.diameterRelative})</span>
              </div>
              <div className="bg-white/5 border border-white/5 p-2 rounded-xl">
                <span className="text-[10px] text-slate-400 block">Kala Revolusi (Orbit)</span>
                <span className="font-bold text-white text-xs block">{body.orbitalPeriod}</span>
                <span className="text-[10px] text-slate-400 font-mono">{body.orbitalVelocity}</span>
              </div>
              <div className="bg-white/5 border border-white/5 p-2 rounded-xl">
                <span className="text-[10px] text-slate-400 block">Kala Rotasi (Hari)</span>
                <span className="font-bold text-white text-xs block">{body.rotationPeriod}</span>
                <span className="text-[10px] text-slate-400 font-mono">Kemiringan: {body.axialTilt}</span>
              </div>
            </div>

            {/* Mass & Gravity Details */}
            <div className="bg-white/5 border border-white/5 p-2.5 rounded-xl space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Massa Planet:</span>
                <span className="font-mono font-medium text-slate-200">{body.massKg}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Gravitasi Permukaan:</span>
                <span className="font-mono font-bold text-emerald-400">{body.gravity}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Suhu Permukaan:</span>
                <span className="font-mono font-medium text-amber-300">
                  {body.surfaceTemp.avg} ({body.surfaceTemp.min || 'n/a'} s/d {body.surfaceTemp.max || 'n/a'})
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Satelit Alami / Bulan:</span>
                <span className="font-mono font-bold text-sky-400">{body.moonsCount} satelit</span>
              </div>
            </div>

            {/* Scientific Fact Quote */}
            <div className="bg-sky-950/40 border border-sky-500/20 p-2.5 rounded-xl">
              <span className="text-[10px] font-bold text-sky-300 flex items-center gap-1 uppercase tracking-wider mb-1">
                <Info className="w-3 h-3" /> Fakta Ilmiah Utama
              </span>
              <p className="text-[11px] text-slate-300 leading-relaxed italic">
                "{body.scientificFact}"
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: ATMOSPHERE */}
        {activeTab === 'atmosphere' && (
          <div className="space-y-2.5 animate-in fade-in duration-200">
            <div className="bg-white/5 border border-white/5 p-3 rounded-xl space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Komposisi Atmosfer & Unsur Kimia
              </span>
              <div className="space-y-1.5">
                {body.atmosphere.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                    <span className="text-slate-200">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-white/5 p-3 rounded-xl space-y-1.5">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                Kondisi Lingkungan & Permukaan
              </span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {body.scientificFact}
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: PLANETARY INTERIOR STRUCTURE */}
        {activeTab === 'interior' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {/* Visual Cutaway Cross-Section SVG Diagram */}
            <div className="bg-slate-900/90 border border-white/10 rounded-xl p-3 flex flex-col items-center shadow-inner">
              <div className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-300 mb-2">
                <span className="flex items-center gap-1.5 text-sky-300">
                  <Layers className="w-3.5 h-3.5 text-sky-400" />
                  Penampang Lapisan Geologis
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {body.interiorLayers?.length || 0} Lapisan
                </span>
              </div>

              {body.interiorLayers && body.interiorLayers.length > 0 ? (
                <div className="w-full flex flex-col items-center">
                  <svg 
                    viewBox="0 0 300 155" 
                    className="w-full max-w-[280px] overflow-visible select-none drop-shadow-md"
                  >
                    <defs>
                      <filter id="layer-glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    {/* Semicircular Layer Slices */}
                    {(() => {
                      const totalLayers = body.interiorLayers.length;
                      const cx = 150;
                      const cy = 135;
                      const maxR = 120;
                      const minR = 24;
                      const step = (maxR - minR) / (totalLayers - 1 || 1);

                      return body.interiorLayers.map((layer, idx) => {
                        const isSelected = selectedLayerIdx === idx;
                        const isHovered = hoveredLayerIdx === idx;
                        const isCore = idx === totalLayers - 1;
                        const rOuter = Math.max(10, maxR - idx * step);
                        const rInner = isCore ? 0 : Math.max(0, maxR - (idx + 1) * step);

                        const pathData = isCore
                          ? `M ${cx - rOuter} ${cy} A ${rOuter} ${rOuter} 0 0 1 ${cx + rOuter} ${cy} Z`
                          : `M ${cx - rOuter} ${cy} A ${rOuter} ${rOuter} 0 0 1 ${cx + rOuter} ${cy} L ${cx + rInner} ${cy} A ${rInner} ${rInner} 0 0 0 ${cx - rInner} ${cy} Z`;

                        return (
                          <path
                            key={idx}
                            d={pathData}
                            fill={layer.color}
                            stroke={isSelected ? '#38bdf8' : isHovered ? '#ffffff' : 'rgba(255,255,255,0.3)'}
                            strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1}
                            opacity={
                              selectedLayerIdx === null 
                                ? (hoveredLayerIdx === null || isHovered ? 1 : 0.6) 
                                : (isSelected ? 1 : 0.45)
                            }
                            filter={isSelected || isHovered ? 'url(#layer-glow)' : undefined}
                            className="cursor-pointer transition-all duration-150"
                            onClick={() => setSelectedLayerIdx(isSelected ? null : idx)}
                            onMouseEnter={() => setHoveredLayerIdx(idx)}
                            onMouseLeave={() => setHoveredLayerIdx(null)}
                          >
                            <title>{`${layer.name} (${layer.depth})`}</title>
                          </path>
                        );
                      });
                    })()}

                    {/* Baseline / Diameter line */}
                    <line x1="20" y1="135" x2="280" y2="135" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="3,3" />

                    {/* Center Core dot */}
                    <circle cx="150" cy="135" r="3" fill="#ffffff" />
                    <text x="150" y="150" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                      Pusat Inti (r = 0 km)
                    </text>
                  </svg>

                  {/* Active Selection Indicator */}
                  <div className="mt-2 text-center">
                    {selectedLayerIdx !== null ? (
                      <span className="text-[11px] font-bold text-sky-300">
                        {body.interiorLayers[selectedLayerIdx].name} ({body.interiorLayers[selectedLayerIdx].depth})
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">
                        Sentuh atau klik lapisan untuk menyorot detail geologis
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">Data interior belum tersedia.</p>
              )}
            </div>

            {/* Layer Detail Cards */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Struktur Lapisan Interior ({body.name})
              </span>
              {body.interiorLayers?.map((layer, idx) => {
                const isSelected = selectedLayerIdx === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedLayerIdx(isSelected ? null : idx)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-sky-950/70 border-sky-400 shadow-md shadow-sky-500/20 ring-1 ring-sky-400/40'
                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/30 shrink-0 shadow-sm"
                          style={{ backgroundColor: layer.color }}
                        />
                        <span className="font-bold text-xs text-white">
                          {layer.name}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-sky-300 border border-white/10">
                        {layer.state}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[11px] mb-1.5">
                      <div className="bg-black/30 p-1.5 rounded-lg">
                        <span className="text-slate-400 block text-[10px]">Kedalaman / Tebal:</span>
                        <span className="text-slate-200 font-mono font-medium">{layer.depth} ({layer.thickness})</span>
                      </div>
                      <div className="bg-black/30 p-1.5 rounded-lg">
                        <span className="text-slate-400 block text-[10px]">Temperatur:</span>
                        <span className="text-amber-300 font-mono font-medium flex items-center gap-1">
                          <Thermometer className="w-3 h-3 shrink-0" />
                          {layer.temperature}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-300 bg-black/20 p-2 rounded-lg space-y-1">
                      <div>
                        <span className="text-slate-400 font-semibold">Komposisi: </span>
                        <span className="text-sky-200">{layer.composition}</span>
                      </div>
                      <p className="text-slate-300 text-[10.5px] leading-relaxed pt-0.5">
                        {layer.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: MISSIONS & RESEARCH */}
        {activeTab === 'missions' && (
          <div className="space-y-2.5 animate-in fade-in duration-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Misi Penjelajahan Ilmiah Terverifikasi (NASA/ESA)
            </span>
            {body.missionsAndResearch.map((mission, idx) => (
              <div key={idx} className="bg-white/5 border border-white/5 p-2.5 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-sky-300">{mission.mission}</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {mission.agency} • {mission.year}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  {mission.discovery}
                </p>
                {mission.paperCitation && (
                  <div className="pt-1 text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                    <BookOpen className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">Ref: {mission.paperCitation}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Floating Actions */}
      <div className="p-3 border-t border-white/10 bg-slate-900/90 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onFocusTarget(body.id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-sky-600/30 transition-all active:scale-95"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Kunci Target ({body.name})</span>
        </button>

        {body.id === 'earth' ? (
          <button
            type="button"
            onClick={onReturnToEarth}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-sky-600/30 hover:bg-sky-600/50 text-sky-200 font-semibold text-xs border border-sky-500/40 transition-colors"
            title="Kembali ke tampilan bola bumi WGS84 dan data spasial GIS Indonesia"
          >
            <Globe2 className="w-3.5 h-3.5 text-sky-400" />
            <span>Peta GIS Indonesia</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onReturnToEarth}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-semibold text-xs border border-white/10 transition-colors"
            title="Kembali ke tampilan Bumi dan data geosains"
          >
            <Globe2 className="w-3.5 h-3.5 text-sky-400" />
            <span>Kembali ke Bumi</span>
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}
