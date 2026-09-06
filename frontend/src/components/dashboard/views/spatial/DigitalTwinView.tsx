import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSchool } from '@/hooks/useSchool';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/services/apiClient';
import {  useToast  } from '@/hooks/useToast';
import { Box, Upload, Trash2, Save, Move, Map, Swords } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';

import { GraphNode, GraphEdge, ToolMode, DisasterType, Hazard, MapPosition } from './digital-twin/types';
import { DigitalTwinCanvas } from './digital-twin/DigitalTwinCanvas';
import { DigitalTwinEditor } from './digital-twin/DigitalTwinEditor';
import { DisasterSimulationPanel } from './digital-twin/DisasterSimulationPanel';
import { DisasterAlert } from './digital-twin/DisasterAlert';
import { calculateEvacuationRoute } from './digital-twin/routeEngine';

import { TeacherDTView } from './digital-twin/teacher/TeacherDTView';

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`glass rounded-2xl p-5 transition-all hover:shadow-glass dark:bg-slate-900/60 ${className}`}>{children}</div>;
}

type DTMode = 'legacy' | 'grid';

export function DigitalTwinView() {
  const { selection } = useSchool();
  const { currentUser } = useAuth();
  const { show } = useToast();
  const { t } = useI18n();
  
  const activeSchool = useMemo(() => selection?.school || null, [selection]);
  const role = currentUser?.role === 'student' ? 'student' : 'teacher';

  // Students and teachers both use legacy for the simulation workspace.
  // Game mode is accessed via a separate route for students.
  const [dtMode, setDtMode] = useState<DTMode>('legacy');

  // Data State
  const [mapImage, setMapImage] = useState<string | null>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [pathStart, setPathStart] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Simulation State
  const [simRunning, setSimRunning] = useState(false);
  const [selectedSim, setSelectedSim] = useState<DisasterType | null>(null);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  
  // Location and Routing
  const [userPosition, setUserPosition] = useState<MapPosition | null>(null);
  const [evacuationPath, setEvacuationPath] = useState<string[]>([]);
  const [watcherId, setWatcherId] = useState<number | null>(null);

  // Teacher mode switcher
  const teacherModeBar = (
    <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 mb-6">
      <button
        onClick={() => setDtMode('legacy')}
        className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
          dtMode === 'legacy'
            ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-400'
            : 'text-ink-500 hover:text-ink-800 dark:text-slate-400'
        }`}
      >
        <Map className="h-4 w-4" /> Editor SVG (Lama)
      </button>
      <button
        onClick={() => setDtMode('grid')}
        className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
          dtMode === 'grid'
            ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-400'
            : 'text-ink-500 hover:text-ink-800 dark:text-slate-400'
        }`}
      >
        <Swords className="h-4 w-4" /> Simulasi Grid (Baru)
      </button>
    </div>
  );
  
  // Fetch Legacy Digital Twin Data
  useEffect(() => {
    if (!activeSchool) {
      setLoading(false);
      return;
    }
    const fetchFloorPlan = async () => {
      setLoading(true);
      try {
        const { data } = await apiClient.get(`/api/digital-twin/${activeSchool.id}`);
        if (data) {
          setMapImage(data.mapImage || null);
          setNodes(data.nodes || []);
          setEdges(data.edges || []);
          if (currentUser?.role === 'teacher' || currentUser?.role === 'dev') {
            setSelectedSim(data.disasterType || null);
          } else {
            setSelectedSim(null);
          }
        } else {
          setMapImage(null);
          setNodes([]);
          setEdges([]);
          setSelectedSim(null);
        }
      } catch (_err) {
        console.error('Error fetching digital twin data.');
      } finally {
        setLoading(false);
      }
    };
    fetchFloorPlan();
  }, [activeSchool]);

  // Clean up watchers
  useEffect(() => {
    return () => {
      if (watcherId !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watcherId);
      }
    };
  }, [watcherId]);

  // Handle Simulation Start/Stop
  const toggleSimulation = useCallback(() => {
    if (simRunning) {
      // Stop
      setSimRunning(false);
      setHazards([]);
      setEvacuationPath([]);
      if (watcherId !== null) {
        navigator.geolocation.clearWatch(watcherId);
        setWatcherId(null);
      }
    } else {
      // Start
      if (!selectedSim) return;
      setSimRunning(true);

      // Create an initial hazard in the center for the simulation
      const newHazard: Hazard = {
        id: `hz_${Date.now()}`,
        type: selectedSim,
        x: 400,
        y: 250,
        radius: 120,
        severity: 'high',
        active: true
      };
      setHazards([newHazard]);

      // Handle GPS (Fallback to first waypoint if denied)
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        const wid = navigator.geolocation.watchPosition(
          (pos) => {
            // Note: Mathematical geo-to-local projection requires calibration.
            // For this enhancement without breaking changes, we keep it abstract.
            setUserPosition({ type: 'geo', latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          },
          (err) => {
            console.warn("GPS Denied or unavailable, falling back to manual/local tracking.", err);
            // Fallback: place user at the first non-exit waypoint
            const startNode = nodes.find(n => n.type === 'waypoint');
            if (startNode) {
              setUserPosition({ type: 'local', x: startNode.x, y: startNode.y });
              setEvacuationPath(calculateEvacuationRoute(startNode.id, nodes, edges, [newHazard]));
            }
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
        setWatcherId(wid);
      } else {
        // Fallback
        const startNode = nodes.find(n => n.type === 'waypoint');
        if (startNode) {
          setUserPosition({ type: 'local', x: startNode.x, y: startNode.y });
          setEvacuationPath(calculateEvacuationRoute(startNode.id, nodes, edges, [newHazard]));
        }
      }
    }
  }, [simRunning, selectedSim, nodes, edges, watcherId]);

  // Editor Actions
  const saveFloorPlan = async () => {
    if (!activeSchool) return;
    if (currentUser?.role === 'student') {
      show('Simulasi disimpan sementara di sesi Anda (Tidak menimpa peta sekolah utama)', 'info');
      setIsEditing(false);
      return;
    }
    setSaving(true);
    try {
      await apiClient.post(`/api/digital-twin/${activeSchool.id}`, { mapImage, nodes, edges, disasterType: selectedSim });
      show('Data Digital Twin disimpan ke server', 'success');
      setIsEditing(false);
    } catch (err) {
      show('Gagal menyimpan data ke server', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveDisasterType = async (type: DisasterType) => {
    setSelectedSim(type);
    if (currentUser?.role !== 'teacher' && currentUser?.role !== 'dev') {
      show('Skenario bencana disetel untuk simulasi Anda', 'info');
      return;
    }
    if (!activeSchool) return;
    try {
      await apiClient.post(`/api/digital-twin/${activeSchool.id}`, { mapImage, nodes, edges, disasterType: type });
      show('Skenario bencana berhasil disimpan', 'success');
    } catch (err) {
      show('Gagal menyimpan skenario bencana', 'error');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setMapImage(event.target?.result as string);
      setNodes([]); 
      setEdges([]);
      setIsEditing(true);
      setActiveTool('waypoint');
    };
    reader.readAsDataURL(file);
  };

  const clearData = () => {
    if(confirm('Hapus gambar peta dan jalur?')) {
      setMapImage(null);
      setNodes([]);
      setEdges([]);
      setSimRunning(false);
      setPathStart(null);
    }
  };

  // Canvas Handlers
  const handleSvgClick = (e: React.MouseEvent, CTM: DOMMatrix) => {
    if (draggingId || simRunning || !isEditing) return;
    
    if (activeTool === 'select' || activeTool === 'path') {
      if (activeTool === 'path') setPathStart(null);
      return;
    }

    const svg = e.currentTarget as SVGSVGElement;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(CTM.inverse());
    
    setNodes([...nodes, { 
      id: `node_${Date.now()}`, 
      x: svgP.x, 
      y: svgP.y, 
      type: activeTool === 'exit' ? 'exit' : 'waypoint' 
    }]);
  };

  const handleNodeClick = (e: React.MouseEvent, id: string) => {
    if (simRunning || !isEditing) return;
    e.stopPropagation();

    if (activeTool === 'path') {
      if (!pathStart) {
        setPathStart(id);
      } else {
        if (pathStart !== id) {
          const exists = edges.some(edge => 
            (edge.from === pathStart && edge.to === id) || 
            (edge.from === id && edge.to === pathStart)
          );
          if (!exists) {
            setEdges([...edges, { id: `edge_${Date.now()}`, from: pathStart, to: id }]);
          }
        }
        setPathStart(null);
      }
    } else if (activeTool === 'delete') {
      handleRemoveNode(e, id);
    }
  };

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    if (simRunning || !isEditing || activeTool !== 'select') return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDraggingId(id);
  };

  const handlePointerMove = (e: React.PointerEvent, CTM: DOMMatrix) => {
    if (!draggingId || simRunning || !isEditing || activeTool !== 'select') return;
    e.stopPropagation();
    
    const dx = e.movementX / CTM.a;
    const dy = e.movementY / CTM.d;

    setNodes(nodes.map(n => n.id === draggingId ? { ...n, x: n.x + dx, y: n.y + dy } : n));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingId) {
      e.stopPropagation();
      setDraggingId(null);
      (e.target as Element).releasePointerCapture(e.pointerId);
    }
  };

  const handleRemoveNode = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNodes(nodes.filter(n => n.id !== id));
    setEdges(edges.filter(edge => edge.from !== id && edge.to !== id));
    if (pathStart === id) setPathStart(null);
  };

  const handleRemoveEdge = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setEdges(edges.filter(edge => edge.id !== id));
  };

  if (loading) return <div className="p-8 text-center text-ink-500">Memuat denah sekolah...</div>;
  if (!activeSchool) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center">
          <Box className="mx-auto h-12 w-12 text-ink-300 dark:text-slate-600 mb-4" />
          <h2 className="text-lg font-bold text-ink-900 dark:text-white mb-2">{t('school.unknown')}</h2>
          <p className="text-sm text-ink-500 dark:text-slate-400 max-w-sm mx-auto">
            {t('spatial.digital_twin_requires_school')}
          </p>
        </div>
      </div>
    );
  }

  // ── Route to new views ───────────────────────────────────

  if (dtMode === 'grid') {
    return (
      <div>
        {teacherModeBar}
        <TeacherDTView />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 relative">
      {teacherModeBar}
      {/* Alert Overlay */}

      {simRunning && selectedSim && (
        <DisasterAlert type={selectedSim} onDismiss={() => setSimRunning(false)} />
      )}

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-6 text-white shadow-glass-lg sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:36px_36px] opacity-15" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <Box className="h-3.5 w-3.5 animate-pulse" /> Kembar Digital 3D / Digital Twin Plan
            </div>
            <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              {activeSchool.name}
            </h2>
            <p className="mt-1.5 max-w-md text-sm text-brand-100">
              {role === 'teacher' 
                ? 'Unggah foto peta/denah sekolah, lalu rancang jaringan jalur evakuasi.' 
                : 'Pelajari rute evakuasi darurat pada peta sekolah Anda.'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-9 space-y-6">
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <h3 className="font-display text-sm font-bold text-ink-900 dark:text-white">
                Kanvas Peta Sekolah
              </h3>
              <div className="flex flex-wrap gap-2">
                {!simRunning && (
                  <>
                    <label className="whitespace-nowrap cursor-pointer flex items-center gap-2 text-xs font-bold bg-brand-50 text-brand-700 px-4 py-2 rounded-lg hover:bg-brand-100">
                      <Upload className="h-4 w-4 shrink-0" /> Unggah Peta
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                    {mapImage && (
                      <button onClick={clearData} className="whitespace-nowrap flex items-center gap-2 text-xs font-bold bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100">
                        <Trash2 className="h-4 w-4 shrink-0" /> Bersihkan
                      </button>
                    )}
                    {isEditing ? (
                      <button onClick={saveFloorPlan} disabled={saving || !mapImage} className="whitespace-nowrap flex items-center gap-2 text-xs font-bold bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 shadow-glow">
                        <Save className="h-4 w-4 shrink-0" /> {saving ? 'Menyimpan...' : 'Simpan Pembaruan'}
                      </button>
                    ) : (
                      mapImage && (
                        <button onClick={() => setIsEditing(true)} className="whitespace-nowrap flex items-center gap-2 text-xs font-bold bg-brand-50 text-brand-700 px-4 py-2 rounded-lg hover:bg-brand-100">
                          <Move className="h-4 w-4 shrink-0" /> Edit Peta
                        </button>
                      )
                    )}
                  </>
                )}
              </div>
            </div>

            {mapImage ? (
              <DigitalTwinCanvas
                mapImage={mapImage}
                nodes={nodes}
                edges={edges}
                hazards={hazards}
                isEditing={isEditing}
                activeTool={activeTool}
                pathStart={pathStart}
                role={role}
                simRunning={simRunning}
                userPosition={userPosition}
                evacuationPath={evacuationPath}
                onSvgClick={handleSvgClick}
                onNodeClick={handleNodeClick}
                onNodePointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onRemoveEdge={handleRemoveEdge}
                onRemoveNode={handleRemoveNode}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-[450px] border-2 border-dashed border-brand-200 dark:border-slate-700 rounded-xl bg-brand-50/30 dark:bg-slate-800/30">
                <Box className="h-12 w-12 text-brand-300 dark:text-slate-500 mb-3" />
                <p className="text-sm font-semibold text-ink-600 dark:text-slate-300 mb-4">Belum ada peta/denah sekolah.</p>
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <DigitalTwinEditor
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            setPathStart={setPathStart}
            isEditing={isEditing}
            hasNodes={nodes.length > 0}
          />
        </div>
      </div>

      {!isEditing && (
        <DisasterSimulationPanel
          simRunning={simRunning}
          selectedSim={selectedSim}
          onSelectSim={saveDisasterType}
          onToggleSim={toggleSimulation}
          hasMap={!!mapImage}
          hasNodes={nodes.length > 1}
        />
      )}
    </div>
  );
}
