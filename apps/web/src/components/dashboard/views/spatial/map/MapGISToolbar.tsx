import React, { useEffect, useRef, useState, useCallback } from "react";
import Map from "ol/Map";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Draw, { createBox } from "ol/interaction/Draw";
import Modify from "ol/interaction/Modify";
import Translate from "ol/interaction/Translate";
import Select from "ol/interaction/Select";
import DoubleClickZoom from "ol/interaction/DoubleClickZoom";
import { Style, Stroke, Fill, Circle as CircleStyle, Text } from "ol/style";
import { getLength, getArea } from "ol/sphere";
import { toLonLat, transformExtent } from "ol/proj";
import GeoJSON from "ol/format/GeoJSON";
import LineString from "ol/geom/LineString";
import Polygon, { fromCircle } from "ol/geom/Polygon";
import CircleGeom from "ol/geom/Circle";
import Geometry from "ol/geom/Geometry";
import {
  MousePointer,
  PenTool,
  Square,
  Circle as CircleIcon,
  Ruler,
  Compass,
  Trash2,
  Undo2,
  CheckCircle2,
  Download,
  ChevronRight,
  Layers,
  Sparkles,
  Move,
  X,
  Crosshair,
  Maximize,
  AlertCircle,
  RotateCcw,
  Table,
} from "lucide-react";
import { aoiService, AreaOfInterest } from "@/services/geospatial/aoiService";

export type MapTool =
  | "PAN"
  | "SELECT"
  | "DRAW_POINT"
  | "DRAW_LINE"
  | "DRAW_POLYGON"
  | "DRAW_RECTANGLE"
  | "DRAW_CIRCLE"
  | "MODIFY"
  | "TRANSLATE"
  | "MEASURE_DISTANCE"
  | "MEASURE_AREA"
  | "MEASURE_BEARING"
  | "IDENTIFY"
  | null;

export type HistoryItem =
  | { action: "DRAW"; feature: Feature }
  | { action: "MODIFY"; feature: Feature; beforeGeom: Geometry; afterGeom: Geometry }
  | { action: "TRANSLATE"; feature: Feature; beforeGeom: Geometry; afterGeom: Geometry }
  | { action: "DELETE"; feature: Feature };

interface MapGISToolbarProps {
  map: Map | null;
  drawingSource?: VectorSource;
  drawingVisible?: boolean;
  drawingOpacity?: number;
  onAOISet?: (aoi: AreaOfInterest) => void;
  onOpenAttributeTable?: () => void;
  onIdentifyCoordinate?: (coord: [number, number]) => void;
  onOpenGeoprocess?: () => void;
  onOpenLayerManager?: () => void;
  selectedFeatureId?: string | number | null;
  onSelectFeatureId?: (id: string | number | null) => void;
  className?: string;
}

function calculateBearing(coord1: [number, number], coord2: [number, number]): number {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLam = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLam) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLam);
  const theta = Math.atan2(y, x);
  return ((theta * 180) / Math.PI + 360) % 360;
}

function getBearingDirection(bearing: number): string {
  const directions = [
    "U (Utara)",
    "TL (Timur Laut)",
    "T (Timur)",
    "TG (Tenggara)",
    "S (Selatan)",
    "BD (Barat Daya)",
    "B (Barat)",
    "BL (Barat Laut)",
  ];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

function checkPolygonSelfIntersection(ringCoords: number[][]): boolean {
  const n = ringCoords.length - 1;
  if (n < 3) return false;

  const ccw = (a: number[], b: number[], c: number[]) => {
    return (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0]);
  };

  const segmentsIntersect = (p1: number[], p2: number[], p3: number[], p4: number[]) => {
    const d1 = ccw(p1, p3, p4);
    const d2 = ccw(p2, p3, p4);
    const d3 = ccw(p1, p2, p3);
    const d4 = ccw(p1, p2, p4);
    return d1 !== d2 && d3 !== d4;
  };

  for (let i = 0; i < n; i++) {
    const p1 = ringCoords[i];
    const p2 = ringCoords[i + 1];
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const p3 = ringCoords[j];
      const p4 = ringCoords[j + 1];
      if (segmentsIntersect(p1, p2, p3, p4)) {
        return true;
      }
    }
  }
  return false;
}

const TOOL_GUIDES: Record<string, { label: string; hint: string }> = {
  DRAW_POINT: {
    label: "Gambar Titik",
    hint: "Klik pada peta untuk menempatkan titik koordinat.",
  },
  DRAW_LINE: {
    label: "Gambar Garis",
    hint: "Klik titik jalur • Klik ganda untuk selesai.",
  },
  DRAW_POLYGON: {
    label: "Gambar Poligon",
    hint: "Klik sudut bidang • Klik ganda untuk menutup.",
  },
  DRAW_RECTANGLE: {
    label: "Kotak Pembatas",
    hint: "Klik & seret pada peta untuk membuat kotak persegi.",
  },
  DRAW_CIRCLE: {
    label: "Lingkaran Radius",
    hint: "Klik titik pusat & seret kursor untuk radius.",
  },
  MODIFY: {
    label: "Edit Simpul",
    hint: "Geser titik sudut objek untuk mengubah bentuk.",
  },
  TRANSLATE: {
    label: "Geser Objek",
    hint: "Seret objek terpilih untuk memindahkan posisinya.",
  },
  MEASURE_DISTANCE: {
    label: "Ukur Jarak",
    hint: "Klik rute titik • Klik ganda untuk selesai.",
  },
  MEASURE_AREA: {
    label: "Ukur Luas",
    hint: "Klik sudut bidang • Klik ganda untuk selesai.",
  },
  MEASURE_BEARING: {
    label: "Ukur Arah / Azimuth",
    hint: "Klik titik awal lalu titik tujuan arah kompas.",
  },
  IDENTIFY: {
    label: "Identifikasi Spasial",
    hint: "Klik lokasi pada peta untuk memeriksa koordinat & data.",
  },
  SELECT: {
    label: "Pilih Objek",
    hint: "Klik objek pada peta untuk memilih atau menghapus.",
  },
};

export const MapGISToolbar: React.FC<MapGISToolbarProps> = ({
  map,
  drawingSource: externalDrawingSource,
  drawingVisible = true,
  drawingOpacity = 1,
  onAOISet,
  onOpenAttributeTable,
  onIdentifyCoordinate,
  onOpenGeoprocess,
  onOpenLayerManager,
  selectedFeatureId,
  onSelectFeatureId,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<MapTool>(null);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [measureResult, setMeasureResult] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ message: string; type: "info" | "warning" | "error" } | null>(null);
  const [featureCount, setFeatureCount] = useState<number>(0);

  const fallbackDrawingSourceRef = useRef<VectorSource>(new VectorSource());
  const drawingSource = externalDrawingSource || fallbackDrawingSourceRef.current;
  const measurementSourceRef = useRef<VectorSource>(new VectorSource());

  const drawingLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const measurementLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const activeInteractionRef = useRef<any>(null);
  const selectInteractionRef = useRef<Select | null>(null);
  const historyStackRef = useRef<HistoryItem[]>([]);
  const activeToolRef = useRef<MapTool>(null);
  const selectedFeatureRef = useRef<Feature | null>(null);

  const showNotification = useCallback((message: string, type: "info" | "warning" | "error" = "info", durationMs = 4500) => {
    setNotice({ message, type });
    const timer = setTimeout(() => {
      setNotice(null);
    }, durationMs);
    return () => clearTimeout(timer);
  }, []);

  // Sync external selectedFeatureId with internal selectedFeature
  useEffect(() => {
    if (!selectedFeatureId) {
      if (selectedFeature) {
        setSelectedFeature(null);
        selectedFeatureRef.current = null;
      }
      if (selectInteractionRef.current) {
        selectInteractionRef.current.getFeatures().clear();
      }
      return;
    }

    const feat = drawingSource.getFeatures().find((f) => {
      const id = f.getId() || f.get("id");
      return id === selectedFeatureId;
    });

    if (feat && feat !== selectedFeature) {
      setSelectedFeature(feat);
      selectedFeatureRef.current = feat;
      if (selectInteractionRef.current) {
        selectInteractionRef.current.getFeatures().clear();
        selectInteractionRef.current.getFeatures().push(feat);
      }
    }
  }, [selectedFeatureId, drawingSource, selectedFeature]);

  // Setup Drawing Layer & Measurement Layer
  useEffect(() => {
    if (!map) return;

    // Vector drawing layer (Z-index 50)
    const drawLayer = new VectorLayer({
      source: drawingSource,
      zIndex: 50,
      visible: drawingVisible,
      opacity: drawingOpacity,
      style: (feature) => {
        const isSelected = selectedFeatureRef.current === feature;
        return new Style({
          fill: new Fill({
            color: isSelected ? "rgba(249, 115, 22, 0.35)" : "rgba(59, 130, 246, 0.25)",
          }),
          stroke: new Stroke({
            color: isSelected ? "#ea580c" : "#2563eb",
            width: isSelected ? 3 : 2,
          }),
          image: new CircleStyle({
            radius: isSelected ? 7 : 6,
            fill: new Fill({ color: isSelected ? "#ea580c" : "#2563eb" }),
            stroke: new Stroke({ color: "#ffffff", width: 2 }),
          }),
        });
      },
    });
    drawingLayerRef.current = drawLayer;
    map.addLayer(drawLayer);

    // Measurement layer (Z-index 51)
    const measureLayer = new VectorLayer({
      source: measurementSourceRef.current,
      zIndex: 51,
      style: (feature) => {
        const measureLabel = feature.get("measureLabel");
        return new Style({
          fill: new Fill({
            color: "rgba(245, 158, 11, 0.2)",
          }),
          stroke: new Stroke({
            color: "#d97706",
            width: 2.5,
            lineDash: [6, 4],
          }),
          image: new CircleStyle({
            radius: 5,
            fill: new Fill({ color: "#d97706" }),
            stroke: new Stroke({ color: "#ffffff", width: 2 }),
          }),
          text: measureLabel
            ? new Text({
                text: measureLabel,
                font: "bold 11px system-ui, -apple-system, sans-serif",
                fill: new Fill({ color: "#78350f" }),
                stroke: new Stroke({ color: "#ffffff", width: 3 }),
                offsetY: -14,
              })
            : undefined,
        });
      },
    });
    measurementLayerRef.current = measureLayer;
    map.addLayer(measureLayer);

    const updateCount = () => {
      setFeatureCount(drawingSource.getFeatures().length);
    };
    drawingSource.on("addfeature", updateCount);
    drawingSource.on("removefeature", updateCount);
    drawingSource.on("clear", updateCount);

    return () => {
      map.removeLayer(drawLayer);
      map.removeLayer(measureLayer);
      drawingSource.un("addfeature", updateCount);
      drawingSource.un("removefeature", updateCount);
      drawingSource.un("clear", updateCount);
    };
  }, [map, drawingSource]);

  // Dynamic synchronization of drawing layer visibility and opacity
  useEffect(() => {
    if (drawingLayerRef.current) {
      drawingLayerRef.current.setVisible(drawingVisible);
      drawingLayerRef.current.setOpacity(drawingOpacity);
    }
  }, [drawingVisible, drawingOpacity]);

  // Re-render layer styles when selection changes without recreating layers
  useEffect(() => {
    drawingLayerRef.current?.changed();
  }, [selectedFeature]);

  // Prevent map from zooming in when double clicking to complete a line or polygon
  const setDoubleClickZoomActive = useCallback(
    (active: boolean) => {
      if (!map) return;
      map.getInteractions().forEach((interaction) => {
        if (interaction instanceof DoubleClickZoom) {
          interaction.setActive(active);
        }
      });
    },
    [map]
  );

  // Reset map target and viewport cursor styles
  const resetMapCursor = useCallback(() => {
    if (!map) return;
    try {
      const target = map.getTargetElement();
      if (target) target.style.cursor = "";
      const viewport = map.getViewport();
      if (viewport) viewport.style.cursor = "";
    } catch {
      // ignore
    }
  }, [map]);

  // Set specific cursor on map target and viewport
  const setMapCursor = useCallback(
    (cursor: string) => {
      if (!map) return;
      try {
        const target = map.getTargetElement();
        if (target) target.style.cursor = cursor;
        const viewport = map.getViewport();
        if (viewport) viewport.style.cursor = cursor;
      } catch {
        // ignore
      }
    },
    [map]
  );

  // Clean up all active interactions and listeners completely
  const removeCurrentInteractions = useCallback(() => {
    if (!map) return;

    resetMapCursor();
    setDoubleClickZoomActive(true);

    if (activeInteractionRef.current) {
      const interaction = activeInteractionRef.current;

      // 1. Abort any in-progress drawing sketch
      if (typeof interaction.abortDrawing === "function") {
        try {
          interaction.abortDrawing();
        } catch {
          // ignore
        }
      }

      // 2. Unbind custom event listeners
      if (typeof interaction.cleanup === "function") {
        try {
          interaction.cleanup();
        } catch {
          // ignore
        }
      }

      // 3. Always remove interaction from OpenLayers map
      try {
        map.removeInteraction(interaction);
      } catch {
        // ignore
      }

      // 4. Safely dispose interaction
      if (typeof interaction.dispose === "function") {
        try {
          interaction.dispose();
        } catch {
          // ignore
        }
      }

      activeInteractionRef.current = null;
    }

    if (selectInteractionRef.current) {
      try {
        map.removeInteraction(selectInteractionRef.current);
      } catch {
        // ignore
      }
      try {
        selectInteractionRef.current.dispose();
      } catch {
        // ignore
      }
      selectInteractionRef.current = null;
    }
  }, [map, resetMapCursor, setDoubleClickZoomActive]);

  // Activate feature selection interaction
  const enableSelectInteraction = useCallback(() => {
    if (!map) return;
    if (selectInteractionRef.current) return;

    resetMapCursor();
    const select = new Select({
      layers: drawingLayerRef.current ? [drawingLayerRef.current] : undefined,
    });

    if (selectedFeatureRef.current) {
      try {
        select.getFeatures().push(selectedFeatureRef.current);
      } catch {
        // ignore
      }
    }

    select.on("select", (evt) => {
      if (evt.selected.length > 0) {
        const feat = evt.selected[0];
        const id = feat.getId() || feat.get("id") || `drawn_${Date.now()}`;
        if (!feat.getId()) feat.setId(id);
        setSelectedFeature(feat);
        selectedFeatureRef.current = feat;
        if (onSelectFeatureId) onSelectFeatureId(id);
      } else if (evt.deselected.length > 0 && evt.selected.length === 0) {
        setSelectedFeature(null);
        selectedFeatureRef.current = null;
        if (onSelectFeatureId) onSelectFeatureId(null);
      }
    });

    let moveRafId: number | null = null;
    const onPointerMove = (evt: any) => {
      if (evt.dragging) return;
      const source = drawingLayerRef.current?.getSource();
      if (!source || source.getFeatures().length === 0) {
        setMapCursor("");
        return;
      }
      if (moveRafId !== null) return;
      moveRafId = requestAnimationFrame(() => {
        moveRafId = null;
        try {
          const hit = map.hasFeatureAtPixel(evt.pixel, {
            layerFilter: (l) => l === drawingLayerRef.current,
          });
          setMapCursor(hit ? "pointer" : "");
        } catch {
          setMapCursor("");
        }
      });
    };
    map.on("pointermove", onPointerMove);

    map.addInteraction(select);
    selectInteractionRef.current = select;
    activeInteractionRef.current = {
      cleanup: () => {
        if (moveRafId !== null) cancelAnimationFrame(moveRafId);
        map.un("pointermove", onPointerMove);
      },
    };
  }, [map, onSelectFeatureId, resetMapCursor, setMapCursor]);

  // Ensure SELECT interaction is active on mount or when returning to idle/SELECT
  useEffect(() => {
    if (map && (activeTool === "SELECT" || activeTool === null)) {
      enableSelectInteraction();
    }
  }, [map, activeTool, enableSelectInteraction]);

  // Unified tool deactivation handler (returns cleanly to SELECT mode)
  const deactivateCurrentTool = useCallback(
    (clearMeasurement = false) => {
      removeCurrentInteractions();
      setActiveTool("SELECT");
      activeToolRef.current = "SELECT";
      enableSelectInteraction();
      if (clearMeasurement) {
        setMeasureResult(null);
      }
    },
    [removeCurrentInteractions, enableSelectInteraction]
  );

  // Unified Tool Transition Manager
  const setTool = useCallback(
    (tool: MapTool) => {
      if (!map) return;

      removeCurrentInteractions();

      // If clicking SELECT, PAN, or null: return to idle SELECT mode
      if (tool === "SELECT" || tool === "PAN" || tool === null) {
        setActiveTool("SELECT");
        activeToolRef.current = "SELECT";
        enableSelectInteraction();
        return;
      }

      // If clicking the current active tool again: toggle it off to SELECT
      if (activeToolRef.current === tool) {
        deactivateCurrentTool(false);
        return;
      }

      setActiveTool(tool);
      activeToolRef.current = tool;

      // Clear previous measurement only when starting a new measurement
      if (tool.startsWith("MEASURE_")) {
        setMeasureResult(null);
        measurementSourceRef.current.clear();
      }

      // Suppress DoubleClickZoom on tools requiring double-click completion
      if (["DRAW_LINE", "DRAW_POLYGON", "MEASURE_DISTANCE", "MEASURE_AREA"].includes(tool)) {
        setDoubleClickZoomActive(false);
      }

      switch (tool) {
        case "IDENTIFY": {
          setMapCursor("crosshair");
          const onMapClick = (evt: any) => {
            const coords = toLonLat(evt.coordinate) as [number, number];
            if (onIdentifyCoordinate) {
              onIdentifyCoordinate(coords);
            }
            // Deactivate identify after single click so it doesn't stick to cursor
            setTimeout(() => {
              deactivateCurrentTool(false);
            }, 50);
          };
          map.on("singleclick", onMapClick);
          activeInteractionRef.current = {
            cleanup: () => map.un("singleclick", onMapClick),
          };
          break;
        }

        case "DRAW_POINT": {
          setMapCursor("crosshair");
          const draw = new Draw({ source: drawingSource, type: "Point" });
          draw.on("drawend", (evt) => {
            const id = `pt_${Date.now()}`;
            evt.feature.setId(id);
            evt.feature.set("name", `Titik #${drawingSource.getFeatures().length + 1}`);
            historyStackRef.current.push({ action: "DRAW", feature: evt.feature });
            setSelectedFeature(evt.feature);
            selectedFeatureRef.current = evt.feature;
            if (onSelectFeatureId) onSelectFeatureId(id);
            showNotification("Titik koordinat berhasil ditambahkan.", "info");

            // Deactivate draw tool so point sketch does not stay stuck to cursor
            setTimeout(() => {
              setTool("SELECT");
            }, 50);
          });
          map.addInteraction(draw);
          activeInteractionRef.current = draw;
          break;
        }

        case "DRAW_LINE": {
          setMapCursor("crosshair");
          const draw = new Draw({ source: drawingSource, type: "LineString" });
          draw.on("drawend", (evt) => {
            const geom = evt.feature.getGeometry() as LineString;
            const coords = geom.getCoordinates();

            // Validate coordinates: minimum 2 distinct points
            if (coords.length < 2) {
              drawingSource.removeFeature(evt.feature);
              showNotification("Garis memerlukan minimal 2 simpul koordinat.", "warning");
              setTimeout(() => deactivateCurrentTool(false), 50);
              return;
            }

            // Clean duplicate trailing double-click vertex if any
            if (
              coords.length > 2 &&
              coords[coords.length - 1][0] === coords[coords.length - 2][0] &&
              coords[coords.length - 1][1] === coords[coords.length - 2][1]
            ) {
              coords.pop();
              geom.setCoordinates(coords);
            }

            const lengthMeters = getLength(geom, { projection: "EPSG:3857" });
            const id = `line_${Date.now()}`;
            evt.feature.setId(id);
            evt.feature.set("name", `Garis #${drawingSource.getFeatures().length + 1}`);
            evt.feature.set("lengthMeters", Math.round(lengthMeters));
            historyStackRef.current.push({ action: "DRAW", feature: evt.feature });
            setSelectedFeature(evt.feature);
            selectedFeatureRef.current = evt.feature;
            if (onSelectFeatureId) onSelectFeatureId(id);
            showNotification(`Garis berhasil digambar (${Math.round(lengthMeters)} m).`, "info");

            // Deactivate draw tool so line sketch does not stay stuck to cursor
            setTimeout(() => {
              setTool("SELECT");
            }, 50);
          });
          map.addInteraction(draw);
          activeInteractionRef.current = draw;
          break;
        }

        case "DRAW_POLYGON": {
          setMapCursor("crosshair");
          const draw = new Draw({ source: drawingSource, type: "Polygon" });
          draw.on("drawend", (evt) => {
            const geom = evt.feature.getGeometry() as Polygon;
            const rings = geom.getCoordinates();
            const outerRing = rings[0] || [];

            // Validate vertices: at least 3 distinct vertices
            if (outerRing.length < 4) {
              drawingSource.removeFeature(evt.feature);
              showNotification("Poligon memerlukan minimal 3 simpul berbeda.", "warning");
              setTimeout(() => deactivateCurrentTool(false), 50);
              return;
            }

            const areaSqM = getArea(geom, { projection: "EPSG:3857" });
            const id = `poly_${Date.now()}`;
            evt.feature.setId(id);
            evt.feature.set("name", `Poligon #${drawingSource.getFeatures().length + 1}`);
            evt.feature.set("areaSqM", Math.round(areaSqM));
            historyStackRef.current.push({ action: "DRAW", feature: evt.feature });
            setSelectedFeature(evt.feature);
            selectedFeatureRef.current = evt.feature;
            if (onSelectFeatureId) onSelectFeatureId(id);
            showNotification(`Poligon berhasil digambar (${Math.round(areaSqM)} m²).`, "info");

            // Deactivate draw tool so polygon sketch does not stay stuck to cursor
            setTimeout(() => {
              setTool("SELECT");
            }, 50);
          });
          map.addInteraction(draw);
          activeInteractionRef.current = draw;
          break;
        }

        case "DRAW_RECTANGLE": {
          setMapCursor("crosshair");
          const draw = new Draw({
            source: drawingSource,
            type: "Circle",
            geometryFunction: createBox(),
          });
          draw.on("drawend", (evt) => {
            const id = `rect_${Date.now()}`;
            evt.feature.setId(id);
            evt.feature.set("name", `Kotak Pembatas #${drawingSource.getFeatures().length + 1}`);
            historyStackRef.current.push({ action: "DRAW", feature: evt.feature });
            setSelectedFeature(evt.feature);
            selectedFeatureRef.current = evt.feature;
            if (onSelectFeatureId) onSelectFeatureId(id);
            showNotification("Kotak pembatas berhasil digambar.", "info");

            // Deactivate draw tool so bounding box does not stay stuck to cursor
            setTimeout(() => {
              setTool("SELECT");
            }, 50);
          });
          map.addInteraction(draw);
          activeInteractionRef.current = draw;
          break;
        }

        case "DRAW_CIRCLE": {
          setMapCursor("crosshair");
          const draw = new Draw({ source: drawingSource, type: "Circle" });
          draw.on("drawend", (evt) => {
            const geom = evt.feature.getGeometry() as CircleGeom;
            const radiusM = Math.round(geom.getRadius());
            const id = `circle_${Date.now()}`;
            evt.feature.setId(id);
            evt.feature.set("name", `Lingkaran Radius #${drawingSource.getFeatures().length + 1}`);
            evt.feature.set("originalGeometry", "Circle");
            evt.feature.set("radiusMeters", radiusM);
            historyStackRef.current.push({ action: "DRAW", feature: evt.feature });
            setSelectedFeature(evt.feature);
            selectedFeatureRef.current = evt.feature;
            if (onSelectFeatureId) onSelectFeatureId(id);
            showNotification(`Lingkaran berhasil digambar (Radius: ${radiusM} m).`, "info");

            // Deactivate draw tool so circle sketch does not stay stuck to cursor
            setTimeout(() => {
              setTool("SELECT");
            }, 50);
          });
          map.addInteraction(draw);
          activeInteractionRef.current = draw;
          break;
        }

        case "MODIFY": {
          if (drawingSource.getFeatures().length === 0) {
            showNotification(
              "Tidak ada objek yang dapat diedit. Gambar atau pilih objek terlebih dahulu.",
              "warning"
            );
            deactivateCurrentTool(false);
            return;
          }

          setMapCursor("cell");
          showNotification("Mode edit simpul aktif. Geser titik sudut atau tekan Esc untuk selesai.", "info", 4000);
          const modify = new Modify({ source: drawingSource });
          const beforeGeoms = new globalThis.Map<Feature, Geometry>();

          modify.on("modifystart", (evt) => {
            beforeGeoms.clear();
            evt.features.forEach((f) => {
              const g = f.getGeometry();
              if (g) beforeGeoms.set(f, g.clone());
            });
          });

          modify.on("modifyend", (evt) => {
            evt.features.forEach((f) => {
              const beforeGeom = beforeGeoms.get(f);
              const afterGeom = f.getGeometry()?.clone();
              if (beforeGeom && afterGeom) {
                historyStackRef.current.push({
                  action: "MODIFY",
                  feature: f,
                  beforeGeom,
                  afterGeom,
                });
                showNotification("Simpul berhasil diperbarui.", "info", 2000);
              }
            });
          });

          map.addInteraction(modify);
          activeInteractionRef.current = modify;
          break;
        }

        case "TRANSLATE": {
          if (!selectedFeatureRef.current) {
            const allFeatures = drawingSource.getFeatures();
            if (allFeatures.length > 0) {
              const latest = allFeatures[allFeatures.length - 1];
              selectedFeatureRef.current = latest;
              setSelectedFeature(latest);
              const id = latest.getId() || latest.get("id");
              if (onSelectFeatureId && id) onSelectFeatureId(id);
            } else {
              showNotification(
                "Tidak ada objek untuk digeser. Gambar objek terlebih dahulu.",
                "warning"
              );
              deactivateCurrentTool(false);
              return;
            }
          }

          setMapCursor("move");
          const currentFeat = selectedFeatureRef.current;
          const select = new Select({
            layers: drawingLayerRef.current ? [drawingLayerRef.current] : undefined,
          });
          select.getFeatures().push(currentFeat);

          const translate = new Translate({
            features: select.getFeatures(),
          });

          let beforeGeom: Geometry | null = null;
          translate.on("translatestart", () => {
            const g = currentFeat.getGeometry();
            if (g) beforeGeom = g.clone();
          });

          translate.on("translateend", () => {
            const afterGeom = currentFeat.getGeometry()?.clone();
            if (beforeGeom && afterGeom) {
              historyStackRef.current.push({
                action: "TRANSLATE",
                feature: currentFeat,
                beforeGeom,
                afterGeom,
              });
              showNotification("Posisi objek berhasil diperbarui.", "info");
            }
            // Return to SELECT mode so dragging map does not move object again
            setTimeout(() => {
              setTool("SELECT");
            }, 50);
          });

          map.addInteraction(select);
          map.addInteraction(translate);
          selectInteractionRef.current = select;
          activeInteractionRef.current = translate;
          break;
        }

        case "MEASURE_DISTANCE": {
          setMapCursor("crosshair");
          const draw = new Draw({
            source: measurementSourceRef.current,
            type: "LineString",
          });
          draw.on("drawend", (evt) => {
            const geom = evt.feature.getGeometry() as LineString;
            const lengthMeters = getLength(geom, { projection: "EPSG:3857" });
            const label =
              lengthMeters >= 1000
                ? `${(lengthMeters / 1000).toFixed(2)} km`
                : `${Math.round(lengthMeters)} m`;

            evt.feature.set("isMeasure", true);
            evt.feature.set("measureLabel", `Jarak: ${label}`);
            setMeasureResult(`Jarak (Geodesik): ${label}`);

            // Deactivate draw tool so measurement line does not stay stuck to cursor
            setTimeout(() => {
              deactivateCurrentTool(false);
            }, 50);
          });
          map.addInteraction(draw);
          activeInteractionRef.current = draw;
          break;
        }

        case "MEASURE_AREA": {
          setMapCursor("crosshair");
          const draw = new Draw({
            source: measurementSourceRef.current,
            type: "Polygon",
          });
          draw.on("drawend", (evt) => {
            const geom = evt.feature.getGeometry() as Polygon;
            const areaSqM = getArea(geom, { projection: "EPSG:3857" });
            const label =
              areaSqM >= 1000000
                ? `${(areaSqM / 1000000).toFixed(3)} km² (${(areaSqM / 10000).toFixed(1)} ha)`
                : areaSqM >= 10000
                ? `${(areaSqM / 10000).toFixed(2)} ha (${Math.round(areaSqM).toLocaleString("id-ID")} m²)`
                : `${Math.round(areaSqM).toLocaleString("id-ID")} m²`;

            evt.feature.set("isMeasure", true);
            evt.feature.set("measureLabel", `Luas: ${label}`);
            setMeasureResult(`Luas (Geodesik): ${label}`);

            // Deactivate draw tool so polygon sketch does not stay stuck to cursor
            setTimeout(() => {
              deactivateCurrentTool(false);
            }, 50);
          });
          map.addInteraction(draw);
          activeInteractionRef.current = draw;
          break;
        }

        case "MEASURE_BEARING": {
          setMapCursor("crosshair");
          const draw = new Draw({
            source: measurementSourceRef.current,
            type: "LineString",
            maxPoints: 2,
          });
          draw.on("drawend", (evt) => {
            const geom = evt.feature.getGeometry() as LineString;
            const coords = geom.getCoordinates();
            if (coords.length >= 2) {
              const p1 = toLonLat(coords[0]) as [number, number];
              const p2 = toLonLat(coords[1]) as [number, number];

              if (p1[0] === p2[0] && p1[1] === p2[1]) {
                measurementSourceRef.current.removeFeature(evt.feature);
                showNotification("Arah tidak dapat dihitung dari dua titik identik.", "warning");
                setTimeout(() => deactivateCurrentTool(false), 50);
                return;
              }

              const bearing = calculateBearing(p1, p2);
              const dir = getBearingDirection(bearing);
              const label = `${bearing.toFixed(1)}° (${dir})`;

              evt.feature.set("isMeasure", true);
              evt.feature.set("measureLabel", `Azimuth: ${label}`);
              setMeasureResult(`Azimuth / Arah Geodesik: ${label}`);
            }

            // Deactivate draw tool so bearing line does not stay stuck to cursor
            setTimeout(() => {
              deactivateCurrentTool(false);
            }, 50);
          });
          map.addInteraction(draw);
          activeInteractionRef.current = draw;
          break;
        }

        default:
          break;
      }
    },
    [
      map,
      drawingSource,
      deactivateCurrentTool,
      removeCurrentInteractions,
      resetMapCursor,
      setMapCursor,
      onIdentifyCoordinate,
      onSelectFeatureId,
      showNotification,
    ]
  );

  // Clean up all interactions on unmount
  useEffect(() => {
    return () => {
      removeCurrentInteractions();
    };
  }, [removeCurrentInteractions]);

  // Listen for Escape key to cleanly cancel any active tool / drawing or deselect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeToolRef.current && activeToolRef.current !== "SELECT") {
          deactivateCurrentTool(false);
          showNotification("Alat dinonaktifkan (Esc).", "info", 2000);
        } else if (selectedFeatureRef.current) {
          setSelectedFeature(null);
          selectedFeatureRef.current = null;
          selectInteractionRef.current?.getFeatures().clear();
          if (onSelectFeatureId) onSelectFeatureId(null);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [deactivateCurrentTool, onSelectFeatureId, showNotification]);

  // Cancel drawing on map canvas right-click
  useEffect(() => {
    if (!map) return;
    const viewport = map.getViewport();
    if (!viewport) return;

    const handleContextMenu = (e: MouseEvent) => {
      if (activeToolRef.current && activeToolRef.current !== "SELECT") {
        e.preventDefault();
        deactivateCurrentTool(false);
        showNotification("Alat dibatalkan (Klik Kanan).", "info", 2000);
      }
    };

    viewport.addEventListener("contextmenu", handleContextMenu);
    return () => {
      viewport.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [map, deactivateCurrentTool, showNotification]);

  // Undo Stack Operation Handler
  const handleUndo = () => {
    const item = historyStackRef.current.pop();
    if (!item) {
      showNotification("Tidak ada riwayat digitasi untuk dibatalkan.", "info");
      return;
    }

    switch (item.action) {
      case "DRAW": {
        drawingSource.removeFeature(item.feature);
        if (selectedFeature === item.feature || selectedFeatureRef.current === item.feature) {
          setSelectedFeature(null);
          selectedFeatureRef.current = null;
          selectInteractionRef.current?.getFeatures().clear();
          if (onSelectFeatureId) onSelectFeatureId(null);
        }
        showNotification("Operasi gambar dibatalkan (Undo).", "info");
        break;
      }
      case "MODIFY":
      case "TRANSLATE": {
        item.feature.setGeometry(item.beforeGeom.clone());
        showNotification(`Perubahan posisi/simpul dibatalkan (${item.action}).`, "info");
        break;
      }
      case "DELETE": {
        drawingSource.addFeature(item.feature);
        setSelectedFeature(item.feature);
        const id = item.feature.getId() || item.feature.get("id");
        if (onSelectFeatureId && id) onSelectFeatureId(id);
        showNotification("Objek yang dihapus berhasil dikembalikan (Undo).", "info");
        break;
      }
    }
  };

  // Delete Selected Feature
  const handleDeleteSelected = () => {
    let target = selectedFeature || selectedFeatureRef.current;
    if (!target) {
      const features = drawingSource.getFeatures();
      if (features.length > 0) {
        target = features[features.length - 1];
      }
    }

    if (!target) {
      showNotification("Pilih objek yang ingin dihapus terlebih dahulu.", "warning");
      return;
    }

    historyStackRef.current.push({ action: "DELETE", feature: target });
    drawingSource.removeFeature(target);
    setSelectedFeature(null);
    selectedFeatureRef.current = null;
    if (onSelectFeatureId) onSelectFeatureId(null);

    if (selectInteractionRef.current) {
      selectInteractionRef.current.getFeatures().clear();
    }
    showNotification("Objek berhasil dihapus.", "info");
  };

  // Clear Digitization and Measurements (Excludes operational layers and active AOI)
  const handleClearAll = () => {
    deactivateCurrentTool(true);
    drawingSource.clear();
    measurementSourceRef.current.clear();
    historyStackRef.current = [];
    setSelectedFeature(null);
    selectedFeatureRef.current = null;
    if (onSelectFeatureId) onSelectFeatureId(null);
    setMeasureResult(null);
    showNotification("Lapisan digitasi dan pengukuran sementara berhasil dibersihkan.", "info");
  };

  // Set selected polygon or circle as Active AOI with validation and cloning
  const handleSetAsAOI = () => {
    deactivateCurrentTool(false);
    const features = drawingSource.getFeatures();
    let targetFeature = selectedFeature;

    if (!targetFeature) {
      const polygonFeatures = features.filter((f) => {
        const type = f.getGeometry()?.getType();
        return type === "Polygon" || type === "Circle";
      });
      if (polygonFeatures.length > 0) {
        targetFeature = polygonFeatures[polygonFeatures.length - 1];
      }
    }

    if (!targetFeature) {
      showNotification(
        "Harap gambar poligon atau kotak terlebih dahulu untuk dijadikan AOI.",
        "warning"
      );
      return;
    }

    let geom = targetFeature.getGeometry();
    if (!geom) return;

    // Handle Circle approximation to Polygon (GeoJSON does not support Circle geometry)
    if (geom.getType() === "Circle") {
      geom = fromCircle(geom as CircleGeom, 64);
    }

    if (geom.getType() !== "Polygon") {
      showNotification(
        "AOI memerlukan geometri bertipe Poligon atau Kotak Pembatas.",
        "warning"
      );
      return;
    }

    const poly = geom as Polygon;
    const rings = poly.getCoordinates();
    const outerRing = rings[0];

    // Validate finite coordinates & length
    if (!outerRing || outerRing.length < 4) {
      showNotification("Poligon tidak valid: simpul kurang dari 3.", "error");
      return;
    }

    // Validate self-intersection
    if (checkPolygonSelfIntersection(outerRing)) {
      showNotification(
        "Poligon tidak valid. Periksa simpul yang saling berpotongan.",
        "error"
      );
      return;
    }

    const areaKm2 = Number((getArea(poly, { projection: "EPSG:3857" }) / 1000000).toFixed(3));
    if (areaKm2 <= 0) {
      showNotification("Poligon tidak valid: luas area harus lebih besar dari 0.", "error");
      return;
    }

    // CLONE geometry to decouple AOI from draw source mutations
    const clonedGeom = poly.clone();
    const format = new GeoJSON();
    const geojsonGeom: any = format.writeGeometryObject(clonedGeom, {
      featureProjection: "EPSG:3857",
      dataProjection: "EPSG:4326",
    });

    const extent = clonedGeom.getExtent();
    const [minX, minY] = toLonLat([extent[0], extent[1]]);
    const [maxX, maxY] = toLonLat([extent[2], extent[3]]);
    const centroidLng = Number(((minX + maxX) / 2).toFixed(6));
    const centroidLat = Number(((minY + maxY) / 2).toFixed(6));

    const newAOI: AreaOfInterest = {
      id: `aoi_drawn_${Date.now()}`,
      name: `AOI Pengguna (${areaKm2 > 0 ? areaKm2 + " km²" : "Kustom"})`,
      sourceType: "DRAWN_POLYGON",
      geometry: geojsonGeom,
      bbox: [minX, minY, maxX, maxY],
      areaKm2,
      perimeterKm: 0,
      centroid: [centroidLng, centroidLat],
      crs: "EPSG:4326",
      createdAt: new Date().toISOString(),
      provenance: {
        sourceType: "VECTOR_MAP",
        provider: "Harmony OpenLayers Digitizer",
        dataset: "User Vector Drawing",
        dataStatus: "LIVE",
        acquisitionTime: new Date().toISOString(),
        processingTime: new Date().toISOString(),
        crs: "EPSG:4326",
        attribution: "Harmony GIS Platform",
      },
    };

    aoiService.setActiveAOI(newAOI);
    if (onAOISet) onAOISet(newAOI);

    showNotification(`AOI Aktif berhasil diset: ${newAOI.name}. Modul studio tersinkronisasi.`, "info", 5000);
  };

  // Set current map viewport as Active AOI
  const handleSetExtentAsAOI = () => {
    if (!map) return;
    const view = map.getView();
    const size = map.getSize();
    if (!size) return;

    const extent = view.calculateExtent(size);
    const [minLng, minLat, maxLng, maxLat] = transformExtent(
      extent,
      "EPSG:3857",
      "EPSG:4326"
    );

    const aoi = aoiService.createExtentAOI([minLng, minLat, maxLng, maxLat]);
    if (onAOISet) onAOISet(aoi);
    showNotification(`Cakupan Layar ditetapkan sebagai AOI (${aoi.areaKm2} km²).`, "info", 5000);
  };

  // Export User Drawings to RFC 7946 Compliant GeoJSON (EPSG:4326)
  const handleExportGeoJSON = () => {
    const rawFeatures = drawingSource.getFeatures();
    if (rawFeatures.length === 0) return;

    // Convert Circles to Polygon approximations before GeoJSON serialization
    const exportableFeatures = rawFeatures.map((f) => {
      const cloned = f.clone();
      const geom = cloned.getGeometry();
      if (geom && geom.getType() === "Circle") {
        const poly = fromCircle(geom as CircleGeom, 64);
        cloned.setGeometry(poly);
      }
      return cloned;
    });

    const format = new GeoJSON();
    const geojson = format.writeFeatures(exportableFeatures, {
      featureProjection: "EPSG:3857",
      dataProjection: "EPSG:4326",
    });

    const todayDate = new Date().toISOString().split("T")[0];
    const blob = new Blob([geojson], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `harmony-map-drawing-${todayDate}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification(`Berkas diekspor: harmony-map-drawing-${todayDate}.geojson`, "info");
  };

  return (
    <div className={className || "absolute top-20 left-4 z-30 transition-all duration-200"}>
      <div className="relative">
        {/* Toggle Expand Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-10 items-center gap-2 rounded-xl bg-white/95 px-3.5 shadow-glass backdrop-blur-xl border border-slate-200/90 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:bg-slate-900/95 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 transition-all"
          title="GIS Digital Tools"
        >
          <Layers className="h-4 w-4 text-brand-500" />
          <span>Alat GIS</span>
          {featureCount > 0 && (
            <span className="rounded-full bg-brand-500 px-1.5 py-0.2 text-[10px] text-white">
              {featureCount}
            </span>
          )}
          <ChevronRight
            className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
              isOpen ? "rotate-90" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 z-40 flex flex-col gap-1.5 rounded-2xl bg-white/95 p-2.5 shadow-2xl backdrop-blur-xl border border-slate-200/90 dark:bg-slate-900/95 dark:border-slate-800 w-72 max-h-[calc(100dvh-6.5rem)] overflow-y-auto overscroll-contain custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Active Tool Status Banner with Guide (shown only for active drawing/measuring tools) */}
            {activeTool && activeTool !== "SELECT" && TOOL_GUIDES[activeTool] && (
              <div className="flex items-center justify-between gap-1.5 rounded-xl bg-indigo-50/90 px-2.5 py-1.5 text-xs border border-indigo-200/80 dark:bg-indigo-950/50 dark:border-indigo-800/70 dark:text-indigo-200 animate-in fade-in duration-150">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-[11px] text-indigo-950 dark:text-indigo-100 truncate">
                      {TOOL_GUIDES[activeTool].label}
                    </div>
                    <div className="text-[10px] text-indigo-700 dark:text-indigo-300 leading-tight">
                      {TOOL_GUIDES[activeTool].hint}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deactivateCurrentTool(false)}
                  className="shrink-0 rounded p-1 hover:bg-indigo-200/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300"
                  title="Selesai / Batalkan Alat (Esc)"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Selected Feature Indicator Banner */}
            {selectedFeature && (
              <div className="flex items-center justify-between gap-1.5 rounded-xl bg-orange-50/95 px-2.5 py-1.5 text-xs border border-orange-300/80 dark:bg-orange-950/50 dark:border-orange-800/70 dark:text-orange-200 animate-in fade-in duration-150">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                  <div className="truncate">
                    <span className="font-bold text-[11px] text-orange-950 dark:text-orange-100">
                      Terpilih:{" "}
                    </span>
                    <span className="text-[11px] font-medium text-orange-800 dark:text-orange-300">
                      {selectedFeature.get("name") || selectedFeature.getId() || "Geometri Vektor"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFeature(null);
                    selectedFeatureRef.current = null;
                    selectInteractionRef.current?.getFeatures().clear();
                    if (onSelectFeatureId) onSelectFeatureId(null);
                  }}
                  className="shrink-0 rounded p-1 hover:bg-orange-200/60 dark:hover:bg-orange-900/60 text-orange-600 dark:text-orange-300"
                  title="Batal Pilih Objek"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Draw Tools */}
            <div className="px-1 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Digitasi Vektor
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setTool("SELECT")}
                className={`flex h-8.5 items-center justify-center rounded-lg border text-xs transition-all ${
                  activeTool === "SELECT" || activeTool === null
                    ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                    : "border-slate-200/70 bg-white/60 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
                title="Pilih Objek (Select)"
              >
                <MousePointer className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setTool("DRAW_POINT")}
                className={`flex h-8.5 items-center justify-center rounded-lg border text-xs transition-all ${
                  activeTool === "DRAW_POINT"
                    ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                    : "border-slate-200/70 bg-white/60 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
                title="Gambar Titik (Point)"
              >
                <span className="text-base font-bold leading-none">•</span>
              </button>

              <button
                type="button"
                onClick={() => setTool("DRAW_LINE")}
                className={`flex h-8.5 items-center justify-center rounded-lg border text-xs transition-all ${
                  activeTool === "DRAW_LINE"
                    ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                    : "border-slate-200/70 bg-white/60 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
                title="Gambar Garis (LineString)"
              >
                <PenTool className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setTool("DRAW_POLYGON")}
                className={`flex h-8.5 items-center justify-center rounded-lg border text-xs transition-all ${
                  activeTool === "DRAW_POLYGON"
                    ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                    : "border-slate-200/70 bg-white/60 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
                title="Gambar Poligon Bebas"
              >
                <Square className="h-4 w-4 rotate-45 scale-75" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setTool("DRAW_RECTANGLE")}
                className={`flex h-8.5 items-center justify-center rounded-lg border text-xs transition-all ${
                  activeTool === "DRAW_RECTANGLE"
                    ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                    : "border-slate-200/70 bg-white/60 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
                title="Gambar Kotak Pembatas (Bounding Box)"
              >
                <Square className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setTool("DRAW_CIRCLE")}
                className={`flex h-8.5 items-center justify-center rounded-lg border text-xs transition-all ${
                  activeTool === "DRAW_CIRCLE"
                    ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                    : "border-slate-200/70 bg-white/60 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
                title="Gambar Lingkaran Radius"
              >
                <CircleIcon className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setTool("MODIFY")}
                className={`flex h-8.5 items-center justify-center rounded-lg border text-xs transition-all ${
                  activeTool === "MODIFY"
                    ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                    : "border-slate-200/70 bg-white/60 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
                title="Edit Simpul (Modify Vertex)"
              >
                <Sparkles className="h-4 w-4 text-emerald-500" />
              </button>

              <button
                type="button"
                onClick={() => setTool("TRANSLATE")}
                className={`flex h-8.5 items-center justify-center rounded-lg border text-xs transition-all ${
                  activeTool === "TRANSLATE"
                    ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                    : "border-slate-200/70 bg-white/60 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
                title="Geser Posisi Objek (Translate)"
              >
                <Move className="h-4 w-4 text-indigo-500" />
              </button>
            </div>

            {/* Geodesic Measurements */}
            <div className="mt-1 px-1 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Pengukuran Geodesik
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setTool("MEASURE_DISTANCE")}
                className={`flex h-8 items-center justify-center gap-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                  activeTool === "MEASURE_DISTANCE"
                    ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                    : "border-slate-200/70 bg-white/60 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
                title="Ukur Jarak (Aproksimasi Geodesik Sferis)"
              >
                <Ruler className="h-3.5 w-3.5" />
                <span>Jarak</span>
              </button>

              <button
                type="button"
                onClick={() => setTool("MEASURE_AREA")}
                className={`flex h-8 items-center justify-center gap-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                  activeTool === "MEASURE_AREA"
                    ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                    : "border-slate-200/70 bg-white/60 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
                title="Ukur Luas (Aproksimasi Geodesik Sferis)"
              >
                <Square className="h-3.5 w-3.5" />
                <span>Luas</span>
              </button>

              <button
                type="button"
                onClick={() => setTool("MEASURE_BEARING")}
                className={`flex h-8 items-center justify-center gap-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                  activeTool === "MEASURE_BEARING"
                    ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                    : "border-slate-200/70 bg-white/60 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
                title="Ukur Arah / Azimuth Geodesik"
              >
                <Compass className="h-3.5 w-3.5" />
                <span>Arah</span>
              </button>
            </div>

            {/* Measurement Result Display */}
            {measureResult && (
              <div className="mt-1 flex items-center justify-between gap-1.5 rounded-xl bg-amber-50/95 px-2.5 py-2 text-xs font-medium text-amber-950 border border-amber-200/90 dark:bg-amber-950/60 dark:border-amber-800/70 dark:text-amber-200 animate-in fade-in duration-150 shadow-xs">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <Ruler className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span className="text-[11px] font-semibold leading-tight">{measureResult}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMeasureResult(null);
                    measurementSourceRef.current.clear();
                  }}
                  className="shrink-0 rounded p-1 text-amber-700 hover:bg-amber-200/60 dark:text-amber-300 dark:hover:bg-amber-900/50 transition-colors"
                  title="Hapus Hasil Pengukuran"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Spatial Analysis & Identify */}
            <div className="mt-1 px-1 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Analisis &amp; Kueri Spasial
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setTool("IDENTIFY")}
                className={`flex h-8 items-center justify-center gap-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                  activeTool === "IDENTIFY"
                    ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                    : "border-slate-200/70 bg-white/60 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
                title="Klik titik di peta untuk identifikasi koordinat, UTM, elevasi & fasilitas"
              >
                <Crosshair className="h-3.5 w-3.5" />
                <span>Identifikasi</span>
              </button>

              <button
                type="button"
                onClick={handleSetExtentAsAOI}
                className="flex h-8 items-center justify-center gap-1 rounded-lg border border-slate-200/70 bg-white/60 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition-all"
                title="Jadikan cakupan layar peta saat ini sebagai Area of Interest (AOI)"
              >
                <Maximize className="h-3.5 w-3.5" />
                <span>Layar = AOI</span>
              </button>

              {onOpenGeoprocess && (
                <button
                  type="button"
                  onClick={onOpenGeoprocess}
                  className="flex h-8 items-center justify-center gap-1 rounded-lg border border-slate-200/70 bg-white/60 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition-all"
                  title="Buka Mesin Geoprosesing (Buffer, BBox, Centroid)"
                >
                  <Sparkles className="h-3.5 w-3.5 text-brand-500" />
                  <span>Proses</span>
                </button>
              )}
            </div>

            {/* Actions: AOI, Undo, Delete, Clear, Export */}
            <div className="mt-1.5 pt-2 border-t border-slate-200/70 dark:border-slate-800 flex flex-col gap-1.5">
              <button
                type="button"
                onClick={handleSetAsAOI}
                className="flex h-8.5 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all shadow-xs active:scale-[0.98]"
                title="Tetapkan Poligon yang Digambar sebagai Area of Interest Aktif"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Jadikan Poligon = AOI</span>
              </button>

              <div className="grid grid-cols-4 gap-1.5 mt-0.5">
                <button
                  type="button"
                  onClick={handleUndo}
                  className="flex h-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Undo Digitasi / Operasi Terakhir"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="flex h-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-rose-600 hover:bg-rose-50 hover:border-rose-300 dark:hover:bg-rose-950/40 transition-colors"
                  title="Hapus Objek Terpilih"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleClearAll}
                  className="flex h-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                  title="Bersihkan Semua Gambar Digitasi & Pengukuran (Reset)"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleExportGeoJSON}
                  disabled={featureCount === 0}
                  className="flex h-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-brand-600 hover:bg-brand-50 hover:border-brand-300 dark:hover:bg-brand-950/40 transition-colors disabled:opacity-40"
                  title="Ekspor Hasil Digitasi ke GeoJSON (EPSG:4326)"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>

              {onOpenAttributeTable && (
                <button
                  type="button"
                  onClick={onOpenAttributeTable}
                  className="mt-0.5 flex h-7.5 items-center justify-center gap-1.5 rounded-lg border border-slate-200/80 bg-white/40 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  <Table className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Buka Tabel Atribut</span>
                </button>
              )}

              {onOpenLayerManager && (
                <button
                  type="button"
                  onClick={onOpenLayerManager}
                  className="flex h-7.5 items-center justify-center gap-1.5 rounded-lg border border-slate-200/80 bg-white/40 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  <Layers className="h-3.5 w-3.5 text-brand-500" />
                  <span>Manajer Lapisan Peta</span>
                </button>
              )}
            </div>

            {/* Contextual Notification */}
            {notice && (
              <div
                className={`mt-1 flex items-start justify-between gap-1.5 rounded-xl p-2 text-[11px] border ${
                  notice.type === "error"
                    ? "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800/60 dark:text-rose-300"
                    : notice.type === "warning"
                    ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-300"
                    : "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-300"
                }`}
              >
                <div className="flex items-start gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{notice.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNotice(null)}
                  className="shrink-0 opacity-70 hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
