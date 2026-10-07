import React, { useState, useMemo, useEffect, useCallback } from "react";
import Map from "ol/Map";
import Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import VectorSource from "ol/source/Vector";
import {
  X,
  Search,
  ArrowUpDown,
  Download,
  Crosshair,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Table as TableIcon,
  RotateCw,
} from "lucide-react";

export interface AttributeTableLayer {
  id: string;
  name: string;
  source?: VectorSource<any> | null;
  getFeatures: () => Feature[];
}

export interface TableRow {
  _id: string | number;
  _feature: Feature;
  [key: string]: any;
}

interface MapAttributeTableProps {
  isOpen: boolean;
  onClose: () => void;
  map: Map | null;
  layers: AttributeTableLayer[];
  initialLayerId?: string;
  selectedFeatureId?: string | number | null;
  onSelectFeatureId?: (id: string | number | null) => void;
}

export const MapAttributeTable: React.FC<MapAttributeTableProps> = ({
  isOpen,
  onClose,
  map,
  layers,
  initialLayerId,
  selectedFeatureId: externalSelectedFeatureId,
  onSelectFeatureId,
}) => {
  const [selectedLayerId, setSelectedLayerId] = useState<string>(
    initialLayerId || (layers[0]?.id ?? "")
  );
  const [refreshNonce, setRefreshNonce] = useState(0);

  // Sync selectedLayerId with initialLayerId or available layers
  useEffect(() => {
    if (initialLayerId && layers.some((l) => l.id === initialLayerId)) {
      setSelectedLayerId(initialLayerId);
    } else if ((!selectedLayerId || !layers.some((l) => l.id === selectedLayerId)) && layers.length > 0) {
      setSelectedLayerId(layers[0].id);
    }
  }, [layers, initialLayerId, selectedLayerId]);

  // Refresh feature list whenever the table is opened
  useEffect(() => {
    if (isOpen) {
      setRefreshNonce((n) => n + 1);
    }
  }, [isOpen]);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isExpanded, setIsExpanded] = useState(false);
  const [internalSelectedFeatureId, setInternalSelectedFeatureId] = useState<string | number | null>(null);

  const selectedFeatureId = externalSelectedFeatureId !== undefined ? externalSelectedFeatureId : internalSelectedFeatureId;

  const currentLayer = useMemo(() => {
    return layers.find((l) => l.id === selectedLayerId) || layers[0];
  }, [layers, selectedLayerId]);

  // Listen to live OpenLayers VectorSource changes
  useEffect(() => {
    const src = currentLayer?.source;
    if (!src) return;

    const onSourceChanged = () => {
      setRefreshNonce((n) => n + 1);
    };

    src.on("change", onSourceChanged);
    return () => {
      src.un("change", onSourceChanged);
    };
  }, [currentLayer?.source]);

  const rawFeatures = useMemo(() => {
    if (!currentLayer) return [];
    try {
      return currentLayer.getFeatures() || [];
    } catch {
      return [];
    }
  }, [currentLayer, refreshNonce]);

  const tableData = useMemo<TableRow[]>(() => {
    return rawFeatures.map((f, idx) => {
      const properties = { ...f.getProperties() };
      delete properties.geometry;
      delete properties.style;

      const geom = f.getGeometry();
      const geomType = geom ? geom.getType() : "None";
      const id = f.getId() ?? properties.id ?? properties.code ?? `obj_${idx + 1}`;

      const enrichedProps: Record<string, any> = {
        id: String(id),
        tipe_geometri: geomType,
        ...properties,
      };

      return {
        _id: id,
        _feature: f,
        ...enrichedProps,
      };
    });
  }, [rawFeatures]);

  const columns = useMemo(() => {
    if (tableData.length === 0) return [];
    const keys = new Set<string>();
    const preferredOrder = ["name", "nama", "tipe_geometri", "id", "type", "cat", "status"];

    tableData.slice(0, 50).forEach((row) => {
      Object.keys(row).forEach((k) => {
        if (!k.startsWith("_")) {
          keys.add(k);
        }
      });
    });

    return Array.from(keys).sort((a, b) => {
      const idxA = preferredOrder.indexOf(a);
      const idxB = preferredOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [tableData]);

  const filteredData = useMemo(() => {
    let result = tableData;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((row) =>
        columns.some((col) => {
          const val = row[col];
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(q);
        }) || String(row._id).toLowerCase().includes(q)
      );
    }
    if (sortColumn) {
      result = [...result].sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (typeof valA === "number" && typeof valB === "number") {
          return sortDirection === "asc" ? valA - valB : valB - valA;
        }
        return sortDirection === "asc"
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }
    return result;
  }, [tableData, searchQuery, sortColumn, sortDirection, columns]);

  // Auto-sync table layer and pagination when selectedFeatureId changes externally
  useEffect(() => {
    if (!selectedFeatureId || !isOpen) return;

    const existsInCurrent = tableData.some(
      (r) => String(r._id) === String(selectedFeatureId)
    );

    if (existsInCurrent) {
      const index = filteredData.findIndex(
        (r) => String(r._id) === String(selectedFeatureId)
      );
      if (index !== -1) {
        const targetPage = Math.floor(index / pageSize) + 1;
        setCurrentPage(targetPage);
      }
      return;
    }

    for (const l of layers) {
      if (l.id === selectedLayerId) continue;
      try {
        const feats = l.getFeatures();
        const match = feats.find((f, idx) => {
          const id = f.getId() ?? f.get("id") ?? f.get("code") ?? `obj_${idx + 1}`;
          return String(id) === String(selectedFeatureId);
        });
        if (match) {
          setSelectedLayerId(l.id);
          setCurrentPage(1);
          setSearchQuery("");
          setSortColumn(null);
          break;
        }
      } catch {
        // ignore
      }
    }
  }, [selectedFeatureId, isOpen, layers, selectedLayerId, tableData, filteredData, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
  };

  const handleLayerChange = (layerId: string) => {
    setSelectedLayerId(layerId);
    setCurrentPage(1);
    setSearchQuery("");
    setSortColumn(null);
  };

  const handleZoomToFeature = useCallback(
    (feature: Feature, id: string | number) => {
      setInternalSelectedFeatureId(id);
      if (onSelectFeatureId) onSelectFeatureId(id);
      if (!map) return;
      const geom = feature.getGeometry();
      if (geom) {
        const extent = geom.getExtent();
        map.getView().fit(extent, {
          duration: 700,
          maxZoom: 16,
          padding: [50, 50, 50, 50],
        });
      }
    },
    [map, onSelectFeatureId]
  );

  const handleExportGeoJSON = () => {
    const featuresToExport = searchQuery.trim()
      ? filteredData.map((r) => r._feature)
      : rawFeatures;

    if (featuresToExport.length === 0) return;

    try {
      const format = new GeoJSON();
      const jsonStr = format.writeFeatures(featuresToExport, {
        featureProjection: "EPSG:3857",
        dataProjection: "EPSG:4326",
      });
      const blob = new Blob([jsonStr], { type: "application/geo+json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${currentLayer?.name.toLowerCase().replace(/\s+/g, "_") || "layer"}_export.geojson`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export GeoJSON error:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className={`fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-2xl dark:bg-slate-900/95 dark:border-slate-800 transition-all duration-300 ${
        isExpanded ? "h-[75vh]" : "h-72 sm:h-80"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400">
            <TableIcon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Tabel Atribut Spasial</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {searchQuery.trim()
                  ? `${filteredData.length} dari ${tableData.length} objek`
                  : `${tableData.length} objek`}
              </span>
            </h3>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Layer Selector */}
          <select
            id="attribute-table-layer-select"
            name="attributeTableLayer"
            value={selectedLayerId}
            onChange={(e) => handleLayerChange(e.target.value)}
            className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {layers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              id="attribute-table-search-input"
              name="attributeTableSearch"
              type="text"
              placeholder="Cari atribut..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 w-36 sm:w-48 rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Refresh */}
          <button
            type="button"
            onClick={() => setRefreshNonce((n) => n + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Segarkan Data Layer"
          >
            <RotateCw className="h-3.5 w-3.5 text-slate-500 hover:text-brand-600 dark:text-slate-400" />
          </button>

          {/* Export */}
          <button
            type="button"
            onClick={handleExportGeoJSON}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Ekspor Layer ini ke GeoJSON"
          >
            <Download className="h-3.5 w-3.5 text-brand-500" />
            <span className="hidden sm:inline">Ekspor</span>
          </button>

          {/* Expand */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
            title={isExpanded ? "Perkecil" : "Perbesar"}
          >
            {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
            title="Tutup Tabel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="h-[calc(100%-5rem)] overflow-auto">
        {columns.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            {tableData.length === 0
              ? "Tidak ada data objek pada layer ini."
              : "Tidak ada atribut yang cocok dengan pencarian."}
          </div>
        ) : (
          <table className="w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold">
              <tr>
                <th className="border-b border-slate-200 px-3 py-2 text-center w-12 dark:border-slate-800">
                  Aksi
                </th>
                {columns.map((col) => (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className="cursor-pointer border-b border-slate-200 px-3 py-2 hover:bg-slate-200/60 dark:border-slate-800 dark:hover:bg-slate-700/60 whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col}</span>
                      <ArrowUpDown className="h-3 w-3 opacity-40" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {paginatedData.map((row) => {
                const isSelected = String(selectedFeatureId) === String(row._id);
                return (
                  <tr
                    key={String(row._id)}
                    onClick={() => handleZoomToFeature(row._feature, row._id)}
                    className={`cursor-pointer transition-colors hover:bg-brand-50/60 dark:hover:bg-brand-950/30 ${
                      isSelected ? "bg-brand-50/90 dark:bg-brand-950/50 font-medium" : ""
                    }`}
                  >
                    <td className="px-2 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleZoomToFeature(row._feature, row._id);
                        }}
                        className="rounded p-1 text-slate-400 hover:bg-brand-100 hover:text-brand-600 dark:hover:bg-brand-900/60"
                        title="Pusatkan Peta ke Objek ini"
                      >
                        <Crosshair className="h-3.5 w-3.5" />
                      </button>
                    </td>
                    {columns.map((col) => (
                      <td
                        key={col}
                        className="px-3 py-1.5 text-slate-700 dark:text-slate-300 whitespace-nowrap max-w-xs truncate"
                      >
                        {row[col] !== null && row[col] !== undefined
                          ? typeof row[col] === "object"
                            ? JSON.stringify(row[col])
                            : String(row[col])
                          : "-"}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2 text-xs text-slate-500 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span>Baris per halaman:</span>
          <select
            id="attribute-table-pagesize-select"
            name="attributeTablePageSize"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span className="text-slate-400">
            Halaman {currentPage} dari {totalPages} ({filteredData.length} total baris)
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-30 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-30 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
