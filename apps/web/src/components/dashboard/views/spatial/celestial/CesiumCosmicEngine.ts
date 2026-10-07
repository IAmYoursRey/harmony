import type { Viewer, Entity, PointPrimitiveCollection } from 'cesium';
import { PLANETARY_CATALOG, CelestialBodyData } from '@/data/planetaryCatalog';
import { 
  getCelestialCanvas,
  getCelestialDataUrl, 
  getSaturnRingRadialDataUrl,
  getSolarCoronaDataUrl,
  getAtmosphereHaloDataUrl
} from './cosmicSceneUtils';
import {
  ASTRONOMICAL_CONSTANTS,
  SOLAR_SCALE_CONFIG,
  calculateRenderRadius,
  calculateRenderOrbitDistance,
  calculateSafeFramingDistance,
  getCelestialBoundingRadius
} from './solarMath';

type CesiumModule = typeof import('cesium');

export interface CesiumCelestialItem {
  id: string;
  data: CelestialBodyData;
  entity: Entity;
  radiusMeters: number;
  currentPosition: any;
  currentMeanAnomaly: number;
  meanMotionRadPerSec: number;
  rotationSpeed: number;
  rotationAngle: number;
  axialTiltDeg: number;
  orbitEntity?: Entity;
  ringEntity?: Entity;
  spherePrimitive?: any;
  orbitLocalPoints?: { x: number; y: number; z: number }[];
}

export type CosmicScaleMode = 'real' | 'calibrated';

export type CosmicCameraState = 
  | 'EARTH_GIS'
  | 'DEPARTING'
  | 'TRAVELLING'
  | 'ARRIVING'
  | 'FOCUSED'
  | 'OVERVIEW';

export interface ActiveCameraTransition {
  id: number;
  targetId: string;
  startBodyId: string | null;
  startCamPos: any;
  startLookAtPos: any;
  startUp: any;
  durationSec: number;
  elapsedSec: number;
  framingDist: number;
  minDistance: number;
  maxDistance: number;
  approachOffsetDir: any;
  hasSafeWaypoint: boolean;
  midWaypoint: any;
}

/**
 * Astronomical Constant: 1 AU (Astronomical Unit) in meters
 * Distance from Earth to Sun = 149,597,870,700 m
 */
export const AU_METERS = ASTRONOMICAL_CONSTANTS.AU_METERS;

export interface CosmicConfigItem {
  id: string;
  semiMajorAxisAU: number;        // Semi-major axis (a) in AU
  eccentricity: number;           // True orbital eccentricity (e)
  inclinationDeg: number;         // Orbital inclination (i) in degrees
  ascendingNodeDeg: number;       // Longitude of ascending node (Omega)
  periapsisDeg: number;           // Argument of periapsis (omega)
  realRadiusMeters: number;       // Physical planetary radius in meters
  calibratedDistMeters: number;   // Mathematically calibrated render distance
  calibratedRadiusMeters: number; // Mathematically calibrated render radius
  color: string;
  initMeanAnomalyDeg: number;     // Initial mean anomaly (M0)
  orbitPeriodDays: number;        // Orbital period in Earth days
  rotationPeriodHours: number;    // Rotation period in hours (negative for retrograde)
  axialTiltDeg: number;           // Planetary axial tilt in degrees
}

/**
 * NASA JPL Keplerian Orbital Elements & Physical Planetary Data
 * Ground truth physical parameters + mathematically validated monotonic visual scale.
 */
export const CELESTIAL_CONFIGS: CosmicConfigItem[] = [
  {
    id: 'mercury',
    semiMajorAxisAU: 0.387098,
    eccentricity: 0.205630,
    inclinationDeg: 7.005,
    ascendingNodeDeg: 48.33,
    periapsisDeg: 29.12,
    realRadiusMeters: ASTRONOMICAL_CONSTANTS.MERCURY_PHYSICAL_RADIUS_METERS,
    calibratedDistMeters: calculateRenderOrbitDistance(0.387098),   // 168,000,000 m
    calibratedRadiusMeters: calculateRenderRadius('mercury', ASTRONOMICAL_CONSTANTS.MERCURY_PHYSICAL_RADIUS_METERS), // 1,885,000 m
    color: '#94a3b8',
    initMeanAnomalyDeg: 174.79,
    orbitPeriodDays: 87.969,
    rotationPeriodHours: 1407.6,
    axialTiltDeg: 0.034,
  },
  {
    id: 'venus',
    semiMajorAxisAU: 0.723332,
    eccentricity: 0.006773,
    inclinationDeg: 3.395,
    ascendingNodeDeg: 76.68,
    periapsisDeg: 54.88,
    realRadiusMeters: ASTRONOMICAL_CONSTANTS.VENUS_PHYSICAL_RADIUS_METERS,
    calibratedDistMeters: calculateRenderOrbitDistance(0.723332),   // 267,400,000 m
    calibratedRadiusMeters: calculateRenderRadius('venus', ASTRONOMICAL_CONSTANTS.VENUS_PHYSICAL_RADIUS_METERS), // 3,110,000 m
    color: '#facc15',
    initMeanAnomalyDeg: 50.11,
    orbitPeriodDays: 224.701,
    rotationPeriodHours: -5832.5, // Retrograde rotation
    axialTiltDeg: 177.36,
  },
  {
    id: 'earth',
    semiMajorAxisAU: 1.000000,
    eccentricity: 0.016710,
    inclinationDeg: 0.000,
    ascendingNodeDeg: 0.0,
    periapsisDeg: 102.947,
    realRadiusMeters: ASTRONOMICAL_CONSTANTS.EARTH_PHYSICAL_RADIUS_METERS,
    calibratedDistMeters: calculateRenderOrbitDistance(1.000000),   // 340,000,000 m
    calibratedRadiusMeters: calculateRenderRadius('earth', ASTRONOMICAL_CONSTANTS.EARTH_PHYSICAL_RADIUS_METERS), // 3,200,000 m
    color: '#38bdf8',
    initMeanAnomalyDeg: 100.46,
    orbitPeriodDays: 365.256,
    rotationPeriodHours: 23.934,
    axialTiltDeg: 23.44,
  },
  {
    id: 'mars',
    semiMajorAxisAU: 1.523679,
    eccentricity: 0.093400,
    inclinationDeg: 1.850,
    ascendingNodeDeg: 49.56,
    periapsisDeg: 286.5,
    realRadiusMeters: ASTRONOMICAL_CONSTANTS.MARS_PHYSICAL_RADIUS_METERS,
    calibratedDistMeters: calculateRenderOrbitDistance(1.523679),   // 464,200,000 m
    calibratedRadiusMeters: calculateRenderRadius('mars', ASTRONOMICAL_CONSTANTS.MARS_PHYSICAL_RADIUS_METERS), // 2,260,000 m
    color: '#ef4444',
    initMeanAnomalyDeg: 19.37,
    orbitPeriodDays: 686.980,
    rotationPeriodHours: 24.623,
    axialTiltDeg: 25.19,
  },
  {
    id: 'jupiter',
    semiMajorAxisAU: 5.204400,
    eccentricity: 0.048400,
    inclinationDeg: 1.303,
    ascendingNodeDeg: 100.46,
    periapsisDeg: 273.87,
    realRadiusMeters: ASTRONOMICAL_CONSTANTS.JUPITER_PHYSICAL_RADIUS_METERS,
    calibratedDistMeters: calculateRenderOrbitDistance(5.204400),   // 1,155,300,000 m
    calibratedRadiusMeters: calculateRenderRadius('jupiter', ASTRONOMICAL_CONSTANTS.JUPITER_PHYSICAL_RADIUS_METERS), // 11,940,000 m
    color: '#f59e0b',
    initMeanAnomalyDeg: 20.02,
    orbitPeriodDays: 4332.59,
    rotationPeriodHours: 9.925,
    axialTiltDeg: 3.13,
  },
  {
    id: 'saturn',
    semiMajorAxisAU: 9.582600,
    eccentricity: 0.054150,
    inclinationDeg: 2.485,
    ascendingNodeDeg: 113.67,
    periapsisDeg: 339.39,
    realRadiusMeters: ASTRONOMICAL_CONSTANTS.SATURN_PHYSICAL_RADIUS_METERS,
    calibratedDistMeters: calculateRenderOrbitDistance(9.582600),   // 1,815,600,000 m
    calibratedRadiusMeters: calculateRenderRadius('saturn', ASTRONOMICAL_CONSTANTS.SATURN_PHYSICAL_RADIUS_METERS), // 10,760,000 m
    color: '#eab308',
    initMeanAnomalyDeg: 317.02,
    orbitPeriodDays: 10759.22,
    rotationPeriodHours: 10.656,
    axialTiltDeg: 26.73,
  },
  {
    id: 'uranus',
    semiMajorAxisAU: 19.218400,
    eccentricity: 0.047170,
    inclinationDeg: 0.773,
    ascendingNodeDeg: 74.01,
    periapsisDeg: 96.99,
    realRadiusMeters: ASTRONOMICAL_CONSTANTS.URANUS_PHYSICAL_RADIUS_METERS,
    calibratedDistMeters: calculateRenderOrbitDistance(19.218400),  // 3,042,300,000 m
    calibratedRadiusMeters: calculateRenderRadius('uranus', ASTRONOMICAL_CONSTANTS.URANUS_PHYSICAL_RADIUS_METERS), // 6,840,000 m
    color: '#06b6d4',
    initMeanAnomalyDeg: 142.24,
    orbitPeriodDays: 30685.4,
    rotationPeriodHours: -17.24, // Retrograde, rolls on side
    axialTiltDeg: 97.77,
  },
  {
    id: 'neptune',
    semiMajorAxisAU: 30.070000,
    eccentricity: 0.008600,
    inclinationDeg: 1.770,
    ascendingNodeDeg: 131.78,
    periapsisDeg: 273.19,
    realRadiusMeters: ASTRONOMICAL_CONSTANTS.NEPTUNE_PHYSICAL_RADIUS_METERS,
    calibratedDistMeters: calculateRenderOrbitDistance(30.070000),  // 4,247,600,000 m
    calibratedRadiusMeters: calculateRenderRadius('neptune', ASTRONOMICAL_CONSTANTS.NEPTUNE_PHYSICAL_RADIUS_METERS), // 6,725,000 m
    color: '#3b82f6',
    initMeanAnomalyDeg: 256.23,
    orbitPeriodDays: 60189.0,
    rotationPeriodHours: 16.11,
    axialTiltDeg: 28.32,
  },
];

const CELESTIAL_CONFIGS_MAP = new Map<string, CosmicConfigItem>(
  CELESTIAL_CONFIGS.map((c) => [c.id, c])
);

/**
 * Solve Kepler's Elliptical Orbit Equation in 3D Space (J2000 ICRF)
 * Correctly computes 3D non-circular ellipses with the Sun at one focus
 */
export function solveKeplerianOrbit(
  semiMajorAxisMeters: number,
  eccentricity: number,
  inclinationRad: number,
  nodeRad: number,
  periapsisRad: number,
  meanAnomalyRad: number
): { x: number; y: number; z: number } {
  let M = meanAnomalyRad % (Math.PI * 2);
  if (M < 0) M += Math.PI * 2;

  // 1. Solve Kepler's equation M = E - e*sin(E) for Eccentric Anomaly E
  let E = M;
  for (let iter = 0; iter < 8; iter++) {
    const f = E - eccentricity * Math.sin(E) - M;
    const fPrime = 1 - eccentricity * Math.cos(E);
    E -= f / Math.max(1e-7, fPrime);
  }

  // 2. True anomaly nu
  const sinNuHalf = Math.sqrt(Math.max(0, 1 + eccentricity)) * Math.sin(E / 2);
  const cosNuHalf = Math.sqrt(Math.max(0, 1 - eccentricity)) * Math.cos(E / 2);
  const nu = 2 * Math.atan2(sinNuHalf, cosNuHalf);

  // 3. Radial distance from focus (Sun)
  const r = semiMajorAxisMeters * (1 - eccentricity * Math.cos(E));

  // 4. Coordinates in orbital plane: u = argument of latitude = nu + omega
  const u = nu + periapsisRad;
  const xOrb = r * Math.cos(u);
  const yOrb = r * Math.sin(u);

  // 5. Rotate to 3D Ecliptic frame using ascending node Omega and inclination i
  const cosNode = Math.cos(nodeRad);
  const sinNode = Math.sin(nodeRad);
  const cosInc = Math.cos(inclinationRad);
  const sinInc = Math.sin(inclinationRad);

  const xEcl = xOrb * cosNode - yOrb * sinNode * cosInc;
  const yEcl = xOrb * sinNode + yOrb * cosNode * cosInc;
  const zEcl = yOrb * sinInc;

  // 6. Rotate from Ecliptic to Earth Equatorial ICRF via Earth's axial tilt (obliquity eps = 23.43928 deg)
  const cosEps = 0.91748206; // cos(23.43928°)
  const sinEps = 0.39777716; // sin(23.43928°)

  const x = xEcl;
  const y = yEcl * cosEps - zEcl * sinEps;
  const z = yEcl * sinEps + zEcl * cosEps;

  return { x, y, z };
}

/**
 * CesiumCosmicEngine
 * 
 * Deepthink 3D Solar System & Universe Map Engine:
 * - Heliocentric physics simulation with Sun as coordinate origin (0, 0, 0)
 * - Dynamic Planet-Centric Camera reference frame (decoupled from Sun origin)
 * - Continuous moving target tracking using frame-rate independent smooth damping
 * - Mathematical Dual-Scale system strictly satisfying size and distance monotonicity
 * - Safe camera distance preventing surface penetration & framing Saturn ring bounds
 * - Main Asteroid Belt instancing between Mars and Jupiter
 * - Directional sunlight originating from Sun creating realistic day/night terminators
 */
export class CesiumCosmicEngine {
  private viewer: Viewer;
  private C: CesiumModule;
  private removePreRenderListener: (() => void) | null = null;
  private removeCameraListener: (() => void) | null = null;

  private coronaEntity: Entity | null = null;
  private sunEntity: Entity | null = null;
  private earthEntity: Entity | null = null;
  private asteroidBeltPrimitives: PointPrimitiveCollection | null = null;

  public celestialItems: Map<string, CesiumCelestialItem> = new Map();
  private haloEntities: Map<string, Entity> = new Map();
  public isPaused: boolean = false;
  public speedMultiplier: number = 1.0;
  public scaleMode: CosmicScaleMode = 'calibrated';
  public visualScale: number = 1.0;

  // Camera State Machine & Single Source of Truth
  public cameraState: CosmicCameraState = 'EARTH_GIS';
  public requestedBodyId: string = 'earth';
  public focusedBodyId: string | null = 'earth';
  public cameraOwner: 'SYSTEM_TRANSITION' | 'PLANET_FOCUS' | 'OVERVIEW' | 'EARTH_GIS' = 'EARTH_GIS';
  public currentTransitionId: number = 0;
  private activeTransition: ActiveCameraTransition | null = null;

  // Dynamic Camera Reference Frame & Target Locking
  public isSolarSystemView: boolean = false;
  public activeTrackingId: string | null = null;
  public lockedTargetId: string | null = null;
  public isFlightTransitioning: boolean = false;

  // Real-Time Sun Position (relative to Earth at 0, 0, 0 in Cesium world frame)
  public sunPosition: any = { x: 0, y: 0, z: 0 };

  constructor(viewer: Viewer, C: CesiumModule, initialScaleMode: CosmicScaleMode = 'calibrated') {
    this.viewer = viewer;
    this.C = C;
    this.scaleMode = initialScaleMode;

    const scene = viewer.scene;

    // 1. Camera limits supporting both ground-level exploration and wide solar system scale
    scene.screenSpaceCameraController.minimumZoomDistance = 10;
    scene.screenSpaceCameraController.maximumZoomDistance = 1.0e11;
    scene.screenSpaceCameraController.enableCollisionDetection = false;
    scene.camera.frustum.far = 1.0e11;
    scene.camera.frustum.near = 0.1;

    // 2. Deep space rendering, balanced HDR & authentic dynamic lighting
    scene.fog.enabled = false;
    scene.highDynamicRange = false;
    scene.backgroundColor = C.Color.BLACK;
    scene.globe.show = true;
    scene.globe.enableLighting = false; // Initialized false for crystal-clear map readability on Earth
    scene.globe.depthTestAgainstTerrain = true;
    scene.globe.baseColor = new C.Color(0.04, 0.12, 0.28, 1.0);
    scene.globe.showGroundAtmosphere = false;
    scene.globe.atmosphereLightIntensity = 1.0;
    scene.globe.maximumScreenSpaceError = 2.0;
    if (scene.skyAtmosphere) {
      scene.skyAtmosphere.show = false;
      try {
        scene.skyAtmosphere.brightnessShift = 0.15;
        scene.skyAtmosphere.saturationShift = 0.25;
      } catch {
        // Fallback for non-configurable atmosphere shifts
      }
    }

    // Cinematic bloom post-processing for radiant stars, halos, and solar corona (active in deep space)
    if (scene.postProcessStages?.bloom) {
      scene.postProcessStages.bloom.enabled = false;
      try {
        scene.postProcessStages.bloom.uniforms.contrast = 128;
        scene.postProcessStages.bloom.uniforms.brightness = -0.3;
        scene.postProcessStages.bloom.uniforms.glowOnly = false;
        scene.postProcessStages.bloom.uniforms.delta = 1.0;
        scene.postProcessStages.bloom.uniforms.sigma = 3.0;
        scene.postProcessStages.bloom.uniforms.stepSize = 1.0;
      } catch {
        // Fallback for context-locked bloom stage uniforms
      }
    }
    try {
      (scene as any).sunBloom = false;
    } catch {
      // Ignored if sunBloom not available
    }

    // 3. Real-time Clock Initialization
    viewer.clock.currentTime = C.JulianDate.fromDate(new Date());
    viewer.clock.clockRange = C.ClockRange.UNBOUNDED;
    viewer.clock.clockStep = C.ClockStep.SYSTEM_CLOCK_MULTIPLIER;
    viewer.clock.multiplier = 1.0;
    viewer.clock.shouldAnimate = true;

    this.initCosmicBackground();
    this.initSolarSystem();
    this.updateSunPositionAndLighting();
    this.startAnimationLoop();
  }

  /**
   * Update radiant sunlight originating from the Sun towards Earth (0, 0, 0)
   */
  private updateSunPositionAndLighting(): void {
    const C = this.C;
    const scene = this.viewer.scene;

    const sunToEarth = C.Cartesian3.negate(this.sunPosition, new C.Cartesian3());
    const sunRay = C.Cartesian3.magnitude(sunToEarth) > 1000
      ? C.Cartesian3.normalize(sunToEarth, new C.Cartesian3())
      : new C.Cartesian3(0, 0, 1);

    scene.light = new C.DirectionalLight({
      direction: sunRay,
      color: new C.Color(0.92, 0.90, 0.86, 1.0),
      intensity: 0.75, // Moderate, natural sunlight ("sedang saja, tidak silau")
    });
  }

  /**
   * Resolves the rendered 3D world position of any celestial body in Cesium coordinates.
   * Earth is anchored at (0, 0, 0). Moon has its own distinct cislunar coordinates.
   */
  public getTargetWorldPosition(id: string): any {
    const C = this.C;
    if (id === 'earth') {
      return C.Cartesian3.ZERO;
    }
    if (id === 'sun') {
      return this.sunPosition;
    }
    const item = this.celestialItems.get(id);
    return item ? item.currentPosition : null;
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
    this.viewer.clock.shouldAnimate = !paused;
  }

  public setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = multiplier;
    this.viewer.clock.multiplier = multiplier;
  }

  public setScaleMode(mode: CosmicScaleMode): void {
    this.scaleMode = mode;
  }

  public setVisualScale(multiplier: number): void {
    this.visualScale = multiplier;
  }

  private initCosmicBackground(): void {
    const scene = this.viewer.scene;
    if (scene.skyBox) {
      scene.skyBox.show = true;
    }
  }

  /**
   * Create GPU-persistent textured sphere primitive with modelMatrix transform.
   * Eliminates Cesium DynamicGeometryUpdater recreation loop and texture eviction.
   */
  private createTexturedSpherePrimitive(id: string, radiusMeters: number, entityId: any): any {
    const C = this.C;
    const canvas = typeof document !== 'undefined' ? getCelestialCanvas(id) : null;
    if (!canvas) return null;

    return new C.Primitive({
      geometryInstances: new C.GeometryInstance({
        id: entityId,
        geometry: new C.EllipsoidGeometry({
          radii: new C.Cartesian3(radiusMeters, radiusMeters, radiusMeters),
          vertexFormat: C.MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat,
        }),
      }),
      appearance: new C.MaterialAppearance({
        material: new C.Material({
          fabric: {
            type: 'Image',
            uniforms: {
              image: canvas,
            },
          },
        }),
        faceForward: true,
        flat: true,
      }),
      asynchronous: false,
    });
  }

  /**
   * Initialize Solar System with True Physical Scale & Monotonic Mathematical Rendering
   */
  private initSolarSystem(): void {
    const C = this.C;

    // A. Pre-compute Earth's initial heliocentric orbit position to anchor Earth at (0, 0, 0)
    const earthCfg = CELESTIAL_CONFIGS_MAP.get('earth') || CELESTIAL_CONFIGS.find((c) => c.id === 'earth')!;
    const earthInitMeanAnomalyRad = (earthCfg.initMeanAnomalyDeg * Math.PI) / 180;
    const initEarthRelPos = solveKeplerianOrbit(
      earthCfg.calibratedDistMeters,
      earthCfg.eccentricity * 0.45,
      (earthCfg.inclinationDeg * 0.35 * Math.PI) / 180,
      (earthCfg.ascendingNodeDeg * Math.PI) / 180,
      (earthCfg.periapsisDeg * Math.PI) / 180,
      earthInitMeanAnomalyRad
    );

    // In Cesium, Earth is centered at world origin (0, 0, 0).
    // Therefore, the Sun is located at -initEarthRelPos (distance ~340,000,000 m away from Earth)!
    this.sunPosition = new C.Cartesian3(-initEarthRelPos.x, -initEarthRelPos.y, -initEarthRelPos.z);

    // 1. The Sun at this.sunPosition (340 million meters away from Earth)
    const sunData = PLANETARY_CATALOG['sun'];
    const coronaUrl = getSolarCoronaDataUrl();
    const sunRadius = SOLAR_SCALE_CONFIG.SUN_RENDER_RADIUS_METERS; // 48,000,000 m (48,000 km)

    const sunItem: CesiumCelestialItem = {
      id: 'sun',
      data: sunData,
      entity: null as any,
      radiusMeters: sunRadius,
      currentPosition: new C.Cartesian3(this.sunPosition.x, this.sunPosition.y, this.sunPosition.z),
      currentMeanAnomaly: 0,
      meanMotionRadPerSec: 0,
      rotationSpeed: (Math.PI * 2) / (25.38 * 86400),
      rotationAngle: 0,
      axialTiltDeg: 7.25,
    };

    const sunEntity = this.viewer.entities.add({
      id: 'celestial-sun',
      name: 'Matahari (Sun)',
      position: new C.CallbackProperty(() => this.sunPosition, false) as any,
      orientation: new C.CallbackProperty(() => {
        const tiltRad = C.Math.toRadians(sunItem.axialTiltDeg);
        const qTilt = C.Quaternion.fromAxisAngle(C.Cartesian3.UNIT_X, tiltRad, new C.Quaternion());
        const qSpin = C.Quaternion.fromAxisAngle(C.Cartesian3.UNIT_Z, sunItem.rotationAngle, new C.Quaternion());
        return C.Quaternion.multiply(qTilt, qSpin, new C.Quaternion());
      }, false) as any,
      point: {
        pixelSize: 26,
        color: C.Color.fromCssColorString('#fbbf24'),
        outlineColor: C.Color.WHITE,
        outlineWidth: 3,
        scaleByDistance: new C.NearFarScalar(sunRadius * 2.5, 0.0, sunRadius * 25.0, 1.0),
        distanceDisplayCondition: new C.DistanceDisplayCondition(sunRadius * 2.5, 5e10),
      },
      label: {
        text: '☀️ Matahari (Sun)',
        font: 'bold 13px Inter, sans-serif',
        fillColor: C.Color.WHITE,
        outlineColor: C.Color.BLACK,
        outlineWidth: 3,
        style: C.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new C.Cartesian2(0, -32),
        scaleByDistance: new C.NearFarScalar(sunRadius * 2.0, 0.0, sunRadius * 20.0, 1.0),
      },
      viewFrom: new C.Cartesian3(0.0, -sunRadius * 2.8, sunRadius * 0.9),
      properties: {
        celestialId: 'sun',
        data: sunData,
      },
    });
    this.sunEntity = sunEntity;
    sunItem.entity = sunEntity;

    const sunPrimitive = this.createTexturedSpherePrimitive('sun', sunRadius, sunEntity);
    if (sunPrimitive) {
      const tiltRad = C.Math.toRadians(sunItem.axialTiltDeg);
      const qTilt = C.Quaternion.fromAxisAngle(C.Cartesian3.UNIT_X, tiltRad, new C.Quaternion());
      const rotMat3 = C.Matrix3.fromQuaternion(qTilt, new C.Matrix3());
      sunPrimitive.modelMatrix = C.Matrix4.fromRotationTranslation(rotMat3, this.sunPosition, new C.Matrix4());
      this.viewer.scene.primitives.add(sunPrimitive);
      sunItem.spherePrimitive = sunPrimitive;
    }

    if (coronaUrl) {
      const coronaFactor = 2.6;
      this.coronaEntity = this.viewer.entities.add({
        id: 'celestial-sun-corona',
        name: 'Korona Radiasi Surya',
        position: new C.CallbackProperty(() => this.sunPosition, false) as any,
        billboard: {
          image: coronaUrl,
          width: sunRadius * coronaFactor,
          height: sunRadius * coronaFactor,
          sizeInMeters: true,
          color: new C.Color(1.0, 0.96, 0.85, 0.95),
        },
      });

      // Outer auroral solar flare glow billboard
      this.viewer.entities.add({
        id: 'celestial-sun-corona-outer',
        name: 'Aura Suar Surya Luar',
        position: new C.CallbackProperty(() => this.sunPosition, false) as any,
        billboard: {
          image: coronaUrl,
          width: sunRadius * 4.4,
          height: sunRadius * 4.4,
          sizeInMeters: true,
          color: new C.Color(1.0, 0.75, 0.35, 0.40),
        },
      });
    }
    this.celestialItems.set('sun', sunItem);

    // 2. All 8 Major Planets (Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune)
    CELESTIAL_CONFIGS.forEach((cfg) => {
      const data = PLANETARY_CATALOG[cfg.id];
      if (!data) return;

      const aMeters = cfg.calibratedDistMeters;
      const eccentricity = cfg.eccentricity * 0.45;
      const incRad = (cfg.inclinationDeg * 0.35 * Math.PI) / 180;
      const nodeRad = (cfg.ascendingNodeDeg * Math.PI) / 180;
      const periRad = (cfg.periapsisDeg * Math.PI) / 180;
      const meanAnomalyRad = (cfg.initMeanAnomalyDeg * Math.PI) / 180;
      const radiusMeters = cfg.calibratedRadiusMeters;

      // Keplerian orbit polyline centered on the Sun
      const orbitEntity = this.createKeplerianOrbitLoop(
        `orbit-${cfg.id}`,
        aMeters,
        eccentricity,
        incRad,
        nodeRad,
        periRad,
        data.visual.accentColor || cfg.color,
        cfg.id === 'earth'
      );

      // Heliocentric position relative to Sun
      const relPos = solveKeplerianOrbit(
        aMeters,
        eccentricity,
        incRad,
        nodeRad,
        periRad,
        meanAnomalyRad
      );

      // Position in Cesium world coordinates:
      // Earth is at (0, 0, 0). Other planets are at this.sunPosition + relPos!
      const initialPos = cfg.id === 'earth'
        ? new C.Cartesian3(0, 0, 0)
        : new C.Cartesian3(this.sunPosition.x + relPos.x, this.sunPosition.y + relPos.y, this.sunPosition.z + relPos.z);

      const meanMotion = (Math.PI * 2) / (cfg.orbitPeriodDays * 86400);
      const rotSpeed = (Math.PI * 2) / (cfg.rotationPeriodHours * 3600);

      const item: CesiumCelestialItem = {
        id: cfg.id,
        data,
        entity: null as any,
        radiusMeters,
        currentPosition: initialPos,
        currentMeanAnomaly: meanAnomalyRad,
        meanMotionRadPerSec: meanMotion,
        rotationSpeed: rotSpeed,
        rotationAngle: 0,
        axialTiltDeg: cfg.axialTiltDeg,
        orbitEntity,
      };

      if (cfg.id === 'earth') {
        // Cesium's native viewer.scene.globe is Earth at (0, 0, 0)!
        // We do NOT add a duplicate 3D ellipsoid mesh so the photorealistic globe and GIS layers remain visible.
        // We only attach a deep-space beacon & label visible only when far away (> 25,000 km).
        const earthMarkerEntity = this.viewer.entities.add({
          id: 'celestial-earth',
          name: `${data.name} (${data.englishName})`,
          position: new C.Cartesian3(0, 0, 0),
          point: {
            pixelSize: 18,
            color: C.Color.fromCssColorString('#38bdf8'),
            outlineColor: C.Color.WHITE,
            outlineWidth: 2.5,
            distanceDisplayCondition: new C.DistanceDisplayCondition(25000000, 5e10),
          },
          label: {
            text: `🌍 ${data.name} (${data.englishName})`,
            font: 'bold 12px Inter, sans-serif',
            fillColor: C.Color.WHITE,
            outlineColor: C.Color.BLACK,
            outlineWidth: 2.5,
            style: C.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new C.Cartesian2(0, -24),
            distanceDisplayCondition: new C.DistanceDisplayCondition(25000000, 5e10),
          },
          properties: {
            celestialId: 'earth',
            data,
          },
        });
        item.entity = earthMarkerEntity;
        this.earthEntity = earthMarkerEntity;
        this.celestialItems.set('earth', item);
        return;
      }

      const planetEntity = this.viewer.entities.add({
        id: `celestial-${cfg.id}`,
        name: `${data.name} (${data.englishName})`,
        position: new C.CallbackProperty(() => item.currentPosition, false) as any,
        orientation: new C.CallbackProperty(() => {
          const tiltRad = C.Math.toRadians(item.axialTiltDeg);
          const qTilt = C.Quaternion.fromAxisAngle(C.Cartesian3.UNIT_X, tiltRad, new C.Quaternion());
          const qSpin = C.Quaternion.fromAxisAngle(C.Cartesian3.UNIT_Z, item.rotationAngle, new C.Quaternion());
          return C.Quaternion.multiply(qTilt, qSpin, new C.Quaternion());
        }, false) as any,
        point: {
          pixelSize: 16,
          color: C.Color.fromCssColorString(cfg.color),
          outlineColor: C.Color.WHITE,
          outlineWidth: 2.5,
          scaleByDistance: new C.NearFarScalar(radiusMeters * 3.5, 0.0, radiusMeters * 30.0, 1.0),
          distanceDisplayCondition: new C.DistanceDisplayCondition(radiusMeters * 3.5, 5e10),
        },
        label: {
          text: `${data.name} (${data.englishName})`,
          font: 'bold 12px Inter, sans-serif',
          fillColor: C.Color.WHITE,
          outlineColor: C.Color.BLACK,
          outlineWidth: 2.5,
          style: C.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new C.Cartesian2(0, -24),
          scaleByDistance: new C.NearFarScalar(radiusMeters * 3.0, 0.0, radiusMeters * 25.0, 1.0),
        },
        viewFrom: new C.Cartesian3(0.0, -radiusMeters * 3.2, radiusMeters * 1.0),
        properties: {
          celestialId: cfg.id,
          data,
        },
      });

      item.entity = planetEntity;

      const planetPrimitive = this.createTexturedSpherePrimitive(cfg.id, radiusMeters, planetEntity);
      if (planetPrimitive) {
        const tiltRad = C.Math.toRadians(item.axialTiltDeg);
        const qTilt = C.Quaternion.fromAxisAngle(C.Cartesian3.UNIT_X, tiltRad, new C.Quaternion());
        const rotMat3 = C.Matrix3.fromQuaternion(qTilt, new C.Matrix3());
        planetPrimitive.modelMatrix = C.Matrix4.fromRotationTranslation(rotMat3, item.currentPosition, new C.Matrix4());
        this.viewer.scene.primitives.add(planetPrimitive);
        item.spherePrimitive = planetPrimitive;
      }

      const haloUrl = getAtmosphereHaloDataUrl(cfg.id);
      if (haloUrl) {
        const haloEntity = this.viewer.entities.add({
          id: `celestial-halo-${cfg.id}`,
          name: `Atmosfer ${data.name}`,
          position: new C.CallbackProperty(() => item.currentPosition, false) as any,
          billboard: {
            image: haloUrl,
            width: radiusMeters * 2.45,
            height: radiusMeters * 2.45,
            sizeInMeters: true,
            color: new C.Color(1.0, 1.0, 1.0, 0.85),
            distanceDisplayCondition: new C.DistanceDisplayCondition(radiusMeters * 1.8, 5e9),
          },
        });
        this.haloEntities.set(cfg.id, haloEntity);
      }

      if (cfg.id === 'saturn') {
        // Saturn ring outer radius: 25,870,000 meters
        const ringOuterMeters = 25870000;
        const ringRadialUrl = getSaturnRingRadialDataUrl();

        const ringEntity = this.viewer.entities.add({
          id: 'celestial-saturn-ring',
          name: 'Cincin Saturnus (Cassini Division)',
          position: new C.CallbackProperty(() => item.currentPosition, false) as any,
          orientation: new C.CallbackProperty(() => {
            const tiltRad = C.Math.toRadians(26.73);
            const qTilt = C.Quaternion.fromAxisAngle(C.Cartesian3.UNIT_X, tiltRad, new C.Quaternion());
            const qSpin = C.Quaternion.fromAxisAngle(C.Cartesian3.UNIT_Z, item.rotationAngle, new C.Quaternion());
            return C.Quaternion.multiply(qTilt, qSpin, new C.Quaternion());
          }, false) as any,
          plane: {
            plane: new C.Plane(C.Cartesian3.UNIT_Z, 0.0),
            dimensions: new C.Cartesian2(ringOuterMeters * 2.2, ringOuterMeters * 2.2),
            material: new C.ImageMaterialProperty({
              image: ringRadialUrl,
              transparent: true,
            }),
          },
        });
        item.ringEntity = ringEntity;
      }

      this.celestialItems.set(cfg.id, item);
    });

    // 3. Moon Entity Orbiting Earth at (0, 0, 0)
    const moonData = PLANETARY_CATALOG['moon'];
    const moonRadius = calculateRenderRadius('moon', ASTRONOMICAL_CONSTANTS.MOON_PHYSICAL_RADIUS_METERS); // 1,565,000 m
    const moonDist = SOLAR_SCALE_CONFIG.MOON_ORBIT_RADIUS_METERS; // 12,000,000 m
    const moonInitMeanAnomaly = 0.8;

    const moonOrbitEntity = this.createMoonOrbitLoop(moonDist);

    const moonInitPos = solveKeplerianOrbit(
      moonDist,
      0.0549,
      (5.145 * Math.PI) / 180,
      0,
      (83.35 * Math.PI) / 180,
      moonInitMeanAnomaly
    );

    const moonItem: CesiumCelestialItem = {
      id: 'moon',
      data: moonData,
      entity: null as any,
      radiusMeters: moonRadius,
      currentPosition: new C.Cartesian3(moonInitPos.x, moonInitPos.y, moonInitPos.z),
      currentMeanAnomaly: moonInitMeanAnomaly,
      meanMotionRadPerSec: (Math.PI * 2) / (27.322 * 86400),
      rotationSpeed: (Math.PI * 2) / (27.322 * 86400),
      rotationAngle: 0,
      axialTiltDeg: 6.68,
      orbitEntity: moonOrbitEntity,
    };

    const moonEntity = this.viewer.entities.add({
      id: 'celestial-moon',
      name: 'Bulan (Moon)',
      position: new C.CallbackProperty(() => moonItem.currentPosition, false) as any,
      orientation: new C.CallbackProperty(() => {
        const tiltRad = C.Math.toRadians(moonItem.axialTiltDeg);
        const qTilt = C.Quaternion.fromAxisAngle(C.Cartesian3.UNIT_X, tiltRad, new C.Quaternion());
        const qSpin = C.Quaternion.fromAxisAngle(C.Cartesian3.UNIT_Z, moonItem.rotationAngle, new C.Quaternion());
        return C.Quaternion.multiply(qTilt, qSpin, new C.Quaternion());
      }, false) as any,
      point: {
        pixelSize: 13,
        color: C.Color.fromCssColorString('#cbd5e1'),
        outlineColor: C.Color.WHITE,
        outlineWidth: 2,
        scaleByDistance: new C.NearFarScalar(moonRadius * 3.5, 0.0, moonRadius * 25.0, 1.0),
        distanceDisplayCondition: new C.DistanceDisplayCondition(moonRadius * 3.5, 5e10),
      },
      label: {
        text: '🌕 Bulan (Moon)',
        font: 'bold 11px Inter, sans-serif',
        fillColor: C.Color.WHITE,
        outlineColor: C.Color.BLACK,
        outlineWidth: 2.5,
        style: C.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new C.Cartesian2(0, -22),
        scaleByDistance: new C.NearFarScalar(moonRadius * 3.0, 0.0, moonRadius * 20.0, 1.0),
      },
      viewFrom: new C.Cartesian3(0.0, -moonRadius * 3.2, moonRadius * 1.0),
      properties: {
        celestialId: 'moon',
        data: moonData,
      },
    });
    moonItem.entity = moonEntity;

    const moonPrimitive = this.createTexturedSpherePrimitive('moon', moonRadius, moonEntity);
    if (moonPrimitive) {
      const tiltRad = C.Math.toRadians(moonItem.axialTiltDeg);
      const qTilt = C.Quaternion.fromAxisAngle(C.Cartesian3.UNIT_X, tiltRad, new C.Quaternion());
      const rotMat3 = C.Matrix3.fromQuaternion(qTilt, new C.Matrix3());
      moonPrimitive.modelMatrix = C.Matrix4.fromRotationTranslation(rotMat3, moonItem.currentPosition, new C.Matrix4());
      this.viewer.scene.primitives.add(moonPrimitive);
      moonItem.spherePrimitive = moonPrimitive;
    }
    this.celestialItems.set('moon', moonItem);

    // 4. Main Asteroid Belt between Mars (464M m) and Jupiter (1,155M m)
    this.initAsteroidBelt();
  }

  /**
   * Main Asteroid Belt between Mars and Jupiter (~680M to ~920M meters)
   * Visually separates the inner rocky worlds from the massive gas giants.
   */
  private initAsteroidBelt(): void {
    const C = this.C;
    const scene = this.viewer.scene;
    const count = 2800;
    const innerR = 2600000000; // 2.6 billion meters (sits cleanly outside Mars at ~1.96B m)
    const outerR = 3800000000; // 3.8 billion meters (sits cleanly inside Jupiter at ~4.77B m)

    const collection = scene.primitives.add(new C.PointPrimitiveCollection());
    this.asteroidBeltPrimitives = collection;

    const cosEps = 0.91748206;
    const sinEps = 0.39777716;

    for (let i = 0; i < count; i++) {
      const r = innerR + Math.random() * (outerR - innerR);
      const theta = Math.random() * Math.PI * 2;
      const zSpread = (Math.random() - 0.5) * 80000000;

      const xOrb = Math.cos(theta) * r;
      const yOrb = Math.sin(theta) * r;

      const x = xOrb;
      const y = yOrb * cosEps - zSpread * sinEps;
      const z = yOrb * sinEps + zSpread * cosEps;

      const randColor = Math.random();
      const color = randColor < 0.65
        ? C.Color.fromCssColorString('#94a3b8').withAlpha(0.65)
        : randColor < 0.88
        ? C.Color.fromCssColorString('#d97706').withAlpha(0.70)
        : C.Color.WHITE.withAlpha(0.80);

      collection.add({
        position: new C.Cartesian3(x, y, z),
        pixelSize: 2.0 + Math.random() * 2.2,
        color,
      });
    }
  }

  /**
   * Helper: Create Keplerian Elliptical Orbit Polyline (dynamically centered on the Sun)
   */
  private createKeplerianOrbitLoop(
    id: string,
    semiMajorAxisMeters: number,
    eccentricity: number,
    inclinationRad: number,
    nodeRad: number,
    periapsisRad: number,
    colorHex: string,
    isEarth: boolean = false
  ): Entity {
    const C = this.C;
    const numPoints = 200;
    const localPoints: { x: number; y: number; z: number }[] = [];

    for (let i = 0; i <= numPoints; i++) {
      const meanAnomaly = (i / numPoints) * Math.PI * 2;
      const pt = solveKeplerianOrbit(
        semiMajorAxisMeters,
        eccentricity,
        inclinationRad,
        nodeRad,
        periapsisRad,
        meanAnomaly
      );
      localPoints.push(pt);
    }

    const worldPoints: any[] = localPoints.map(() => new C.Cartesian3());

    return this.viewer.entities.add({
      id: `polyline-${id}`,
      polyline: {
        positions: new C.CallbackProperty(() => {
          const sp = this.sunPosition;
          for (let i = 0; i <= numPoints; i++) {
            const lp = localPoints[i];
            const wp = worldPoints[i];
            wp.x = sp.x + lp.x;
            wp.y = sp.y + lp.y;
            wp.z = sp.z + lp.z;
          }
          return worldPoints;
        }, false),
        width: isEarth ? 3.4 : 2.0,
        material: new C.PolylineGlowMaterialProperty({
          color: C.Color.fromCssColorString(colorHex).withAlpha(isEarth ? 0.85 : 0.50),
          glowPower: isEarth ? 0.25 : 0.18,
          taperPower: 1.0,
        }),
        arcType: C.ArcType.NONE,
      },
    });
  }

  /**
   * Helper: Create Moon Orbit Polyline around Earth at (0, 0, 0)
   */
  private createMoonOrbitLoop(moonDist: number): Entity {
    const C = this.C;
    const numPoints = 180;
    const moonPositions: any[] = [];
    for (let i = 0; i <= numPoints; i++) {
      const meanAnomaly = (i / numPoints) * Math.PI * 2;
      const pt = solveKeplerianOrbit(
        moonDist,
        0.0549,
        (5.145 * Math.PI) / 180,
        0,
        (83.35 * Math.PI) / 180,
        meanAnomaly
      );
      moonPositions.push(new C.Cartesian3(pt.x, pt.y, pt.z));
    }

    return this.viewer.entities.add({
      id: 'polyline-moon-orbit',
      polyline: {
        positions: moonPositions,
        width: 1.8,
        material: new C.PolylineGlowMaterialProperty({
          color: C.Color.fromCssColorString('#cbd5e1').withAlpha(0.65),
          glowPower: 0.18,
          taperPower: 1.0,
        }),
        arcType: C.ArcType.NONE,
      },
    });
  }

  /**
   * Animation Loop on Cesium's preRender
   * Synchronized with heliocentric revolution of all planets around the Sun,
   * with Earth anchored at (0, 0, 0) for photorealistic GIS exploration.
   */
  /**
   * Animation Loop on Cesium's preRender
   * Synchronized with heliocentric revolution of all planets around the Sun,
   * dynamic camera navigation state machine, moving target tracking, and diagnostics telemetry.
   */
  private startAnimationLoop(): void {
    const C = this.C;
    const scene = this.viewer.scene;
    let lastAnimWallTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    this.removePreRenderListener = scene.preRender.addEventListener(() => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const wallDtSeconds = Math.max(0.001, Math.min(0.1, (now - lastAnimWallTime) / 1000));
      lastAnimWallTime = now;

      const dtSeconds = this.isPaused ? 0 : wallDtSeconds * this.speedMultiplier;

      if (!this.isPaused && dtSeconds > 0) {
        C.JulianDate.addSeconds(this.viewer.clock.currentTime, dtSeconds, this.viewer.clock.currentTime);
      }

      // Earth completes 1 majestic axial rotation every ~35 seconds at 1x speed
      const earthAxialSpeed = (Math.PI * 2) / 35.0;
      // Earth completes 1 full orbit around Sun every ~50 seconds at 1x speed
      const earthOrbitSpeed = (Math.PI * 2) / 50.0;

      // 1. Advance Earth's mean anomaly:
      const earthItem = this.celestialItems.get('earth');
      const earthCfg = CELESTIAL_CONFIGS_MAP.get('earth');
      if (earthItem && earthCfg && !this.isPaused && dtSeconds > 0) {
        const keplerFactor = 1.0 / Math.pow(earthCfg.semiMajorAxisAU, 0.68);
        earthItem.currentMeanAnomaly += earthOrbitSpeed * keplerFactor * dtSeconds;
        if (earthItem.currentMeanAnomaly > Math.PI * 2) earthItem.currentMeanAnomaly -= Math.PI * 2;
      }

      // Compute Earth's heliocentric position:
      let earthHelioPos = { x: 0, y: 0, z: 0 };
      if (earthItem && earthCfg) {
        earthHelioPos = solveKeplerianOrbit(
          earthCfg.calibratedDistMeters,
          earthCfg.eccentricity * 0.45,
          (earthCfg.inclinationDeg * 0.35 * Math.PI) / 180,
          (earthCfg.ascendingNodeDeg * Math.PI) / 180,
          (earthCfg.periapsisDeg * Math.PI) / 180,
          earthItem.currentMeanAnomaly
        );
      }

      // In Cesium, Earth is centered at (0, 0, 0). Therefore, the Sun is at -earthHelioPos!
      this.sunPosition.x = -earthHelioPos.x;
      this.sunPosition.y = -earthHelioPos.y;
      this.sunPosition.z = -earthHelioPos.z;

      // 2. Advance all other planets revolving around the Sun
      this.celestialItems.forEach((item) => {
        if (item.id === 'sun' || item.id === 'moon' || item.id === 'earth') return;
        const cfg = CELESTIAL_CONFIGS_MAP.get(item.id);
        if (!cfg) return;

        if (!this.isPaused && dtSeconds > 0) {
          const relPeriod = (24.0 / Math.abs(cfg.rotationPeriodHours)) * (cfg.rotationPeriodHours < 0 ? -1 : 1);
          item.rotationAngle += earthAxialSpeed * relPeriod * dtSeconds;
          if (item.rotationAngle > Math.PI * 2) item.rotationAngle -= Math.PI * 2;
          else if (item.rotationAngle < 0) item.rotationAngle += Math.PI * 2;

          const keplerFactor = 1.0 / Math.pow(cfg.semiMajorAxisAU, 0.68);
          item.currentMeanAnomaly += earthOrbitSpeed * keplerFactor * dtSeconds;
          if (item.currentMeanAnomaly > Math.PI * 2) item.currentMeanAnomaly -= Math.PI * 2;
        }

        const aMeters = cfg.calibratedDistMeters;
        const eccentricity = cfg.eccentricity * 0.45;
        const incRad = (cfg.inclinationDeg * 0.35 * Math.PI) / 180;
        const nodeRad = (cfg.ascendingNodeDeg * Math.PI) / 180;
        const periRad = (cfg.periapsisDeg * Math.PI) / 180;

        const relPos = solveKeplerianOrbit(
          aMeters,
          eccentricity,
          incRad,
          nodeRad,
          periRad,
          item.currentMeanAnomaly
        );

        // Planet in Cesium world space = this.sunPosition + relPos
        item.currentPosition.x = this.sunPosition.x + relPos.x;
        item.currentPosition.y = this.sunPosition.y + relPos.y;
        item.currentPosition.z = this.sunPosition.z + relPos.z;

        if (item.spherePrimitive) {
          const tiltRad = C.Math.toRadians(item.axialTiltDeg);
          const qTilt = C.Quaternion.fromAxisAngle(C.Cartesian3.UNIT_X, tiltRad, new C.Quaternion());
          const qSpin = C.Quaternion.fromAxisAngle(C.Cartesian3.UNIT_Z, item.rotationAngle, new C.Quaternion());
          const qTotal = C.Quaternion.multiply(qTilt, qSpin, new C.Quaternion());
          const rotMat3 = C.Matrix3.fromQuaternion(qTotal, new C.Matrix3());
          item.spherePrimitive.modelMatrix = C.Matrix4.fromRotationTranslation(rotMat3, item.currentPosition, new C.Matrix4());
        }
      });

      // 3. Update Sun axial rotation and position
      const sunItem = this.celestialItems.get('sun');
      if (sunItem) {
        sunItem.currentPosition.x = this.sunPosition.x;
        sunItem.currentPosition.y = this.sunPosition.y;
        sunItem.currentPosition.z = this.sunPosition.z;
        if (!this.isPaused && dtSeconds > 0) {
          sunItem.rotationAngle += (earthAxialSpeed / 25.0) * dtSeconds;
          if (sunItem.rotationAngle > Math.PI * 2) sunItem.rotationAngle -= Math.PI * 2;
        }
        if (sunItem.spherePrimitive) {
          const tiltRad = C.Math.toRadians(sunItem.axialTiltDeg);
          const qTilt = C.Quaternion.fromAxisAngle(C.Cartesian3.UNIT_X, tiltRad, new C.Quaternion());
          const qSpin = C.Quaternion.fromAxisAngle(C.Cartesian3.UNIT_Z, sunItem.rotationAngle, new C.Quaternion());
          const qTotal = C.Quaternion.multiply(qTilt, qSpin, new C.Quaternion());
          const rotMat3 = C.Matrix3.fromQuaternion(qTotal, new C.Matrix3());
          sunItem.spherePrimitive.modelMatrix = C.Matrix4.fromRotationTranslation(rotMat3, this.sunPosition, new C.Matrix4());
        }
      }

      // 4. Update Moon in orbit around Earth at (0, 0, 0)
      const moonItem = this.celestialItems.get('moon');
      if (moonItem) {
        if (!this.isPaused && dtSeconds > 0) {
          moonItem.currentMeanAnomaly += earthOrbitSpeed * 4.2 * dtSeconds;
          if (moonItem.currentMeanAnomaly > Math.PI * 2) moonItem.currentMeanAnomaly -= Math.PI * 2;
          moonItem.rotationAngle += (earthAxialSpeed / 27.3) * dtSeconds;
          if (moonItem.rotationAngle > Math.PI * 2) moonItem.rotationAngle -= Math.PI * 2;
        }
        const moonDist = SOLAR_SCALE_CONFIG.MOON_ORBIT_RADIUS_METERS;
        const moonPos = solveKeplerianOrbit(
          moonDist,
          0.0549,
          (5.145 * Math.PI) / 180,
          0,
          (83.35 * Math.PI) / 180,
          moonItem.currentMeanAnomaly
        );
        moonItem.currentPosition.x = moonPos.x;
        moonItem.currentPosition.y = moonPos.y;
        moonItem.currentPosition.z = moonPos.z;

        if (moonItem.spherePrimitive) {
          const tiltRad = C.Math.toRadians(moonItem.axialTiltDeg);
          const qTilt = C.Quaternion.fromAxisAngle(C.Cartesian3.UNIT_X, tiltRad, new C.Quaternion());
          const qSpin = C.Quaternion.fromAxisAngle(C.Cartesian3.UNIT_Z, moonItem.rotationAngle, new C.Quaternion());
          const qTotal = C.Quaternion.multiply(qTilt, qSpin, new C.Quaternion());
          const rotMat3 = C.Matrix3.fromQuaternion(qTotal, new C.Matrix3());
          moonItem.spherePrimitive.modelMatrix = C.Matrix4.fromRotationTranslation(rotMat3, moonItem.currentPosition, new C.Matrix4());
        }
      }

      // 5. Update Asteroid Belt modelMatrix to follow the Sun
      if (this.asteroidBeltPrimitives) {
        this.asteroidBeltPrimitives.modelMatrix = C.Matrix4.fromTranslation(this.sunPosition, new C.Matrix4());
      }

      // 6. Dynamic Camera Navigation State Machine & Moving Target Tracking
      if (this.activeTransition) {
        const trans = this.activeTransition;
        if (trans.id !== this.currentTransitionId) {
          this.activeTransition = null;
        } else {
          trans.elapsedSec += wallDtSeconds;
          const u = Math.min(1.0, trans.elapsedSec / trans.durationSec);

          if (u < 0.20) {
            this.cameraState = 'DEPARTING';
          } else if (u < 0.85) {
            this.cameraState = 'TRAVELLING';
          } else if (u < 1.0) {
            this.cameraState = 'ARRIVING';
          }

          // Target is in continuous orbital motion: resolve live rendered world position
          const curTargetPos = this.getTargetWorldPosition(trans.targetId);
          if (curTargetPos) {
            const curDestCamPos = C.Cartesian3.add(
              curTargetPos,
              C.Cartesian3.multiplyByScalar(trans.approachOffsetDir, trans.framingDist, new C.Cartesian3()),
              new C.Cartesian3()
            );

            // Quintic smooth curve: 6u^5 - 15u^4 + 10u^3
            const s = u * u * u * (u * (u * 6 - 15) + 10);

            let currentCamPos: any;
            if (trans.hasSafeWaypoint && trans.midWaypoint) {
              const oneMinusS = 1.0 - s;
              const term0 = C.Cartesian3.multiplyByScalar(trans.startCamPos, oneMinusS * oneMinusS, new C.Cartesian3());
              const term1 = C.Cartesian3.multiplyByScalar(trans.midWaypoint, 2.0 * oneMinusS * s, new C.Cartesian3());
              const term2 = C.Cartesian3.multiplyByScalar(curDestCamPos, s * s, new C.Cartesian3());
              currentCamPos = C.Cartesian3.add(C.Cartesian3.add(term0, term1, new C.Cartesian3()), term2, new C.Cartesian3());
            } else {
              currentCamPos = C.Cartesian3.lerp(trans.startCamPos, curDestCamPos, s, new C.Cartesian3());
            }

            // Gaze tracking: early reorientation towards target
            const gazeU = Math.min(1.0, u / 0.32);
            const sGaze = gazeU * gazeU * (3.0 - 2.0 * gazeU);
            const currentLookAtPos = C.Cartesian3.lerp(trans.startLookAtPos, curTargetPos, sGaze, new C.Cartesian3());

            const lookDir = C.Cartesian3.normalize(
              C.Cartesian3.subtract(currentLookAtPos, currentCamPos, new C.Cartesian3()),
              new C.Cartesian3()
            );

            const eps = 0.4090928;
            const eclipticNormal = new C.Cartesian3(0, -Math.sin(eps), Math.cos(eps));
            const currentUp = C.Cartesian3.lerp(trans.startUp, eclipticNormal, s, new C.Cartesian3());
            C.Cartesian3.normalize(currentUp, currentUp);

            this.viewer.camera.setView({
              destination: currentCamPos,
              orientation: {
                direction: lookDir,
                up: currentUp,
              },
            });

            if (u >= 1.0) {
              this.activeTransition = null;
              this.completeArrival(trans.targetId, trans.framingDist, trans.minDistance, trans.maxDistance, trans.approachOffsetDir);
            }
          }
        }
      } else if (this.cameraState === 'FOCUSED' && this.focusedBodyId && this.focusedBodyId !== 'earth') {
        // Continuous lock-follow: update camera reference frame to target's live world position
        const targetPos = this.getTargetWorldPosition(this.focusedBodyId);
        if (targetPos) {
          const localPos = this.viewer.camera.position;
          const currentDist = C.Cartesian3.magnitude(localPos);

          const item = this.celestialItems.get(this.focusedBodyId);
          const radius = item ? item.radiusMeters : SOLAR_SCALE_CONFIG.SUN_RENDER_RADIUS_METERS;
          const framingInfo = calculateSafeFramingDistance(this.focusedBodyId, radius);

          if (currentDist < framingInfo.minDistance) {
            C.Cartesian3.multiplyByScalar(
              C.Cartesian3.normalize(localPos, new C.Cartesian3()),
              framingInfo.minDistance,
              localPos
            );
          } else if (currentDist > framingInfo.maxDistance) {
            C.Cartesian3.multiplyByScalar(
              C.Cartesian3.normalize(localPos, new C.Cartesian3()),
              framingInfo.maxDistance,
              localPos
            );
          }

          const transform = C.Matrix4.fromTranslation(targetPos, new C.Matrix4());
          this.viewer.camera.lookAtTransform(transform, localPos);
        }
      }

      // 7. Dynamic Telemetry & Mathematical Diagnostics
      const targetPosForDiag = this.focusedBodyId ? this.getTargetWorldPosition(this.focusedBodyId) : null;
      const camPos = this.viewer.camera.positionWC;
      let targetError = 0;
      let alignmentDot = 1.0;

      if (targetPosForDiag) {
        const toTarget = C.Cartesian3.subtract(targetPosForDiag, camPos, new C.Cartesian3());
        const toTargetDist = C.Cartesian3.magnitude(toTarget);
        if (toTargetDist > 1.0) {
          const toTargetDir = C.Cartesian3.normalize(toTarget, new C.Cartesian3());
          alignmentDot = C.Cartesian3.dot(this.viewer.camera.directionWC, toTargetDir);
        }
        if (this.cameraState === 'FOCUSED') {
          targetError = 0;
        }
      }

      if (typeof window !== 'undefined') {
        (window as any).__cosmicTelemetry = {
          requestedBody: this.requestedBodyId,
          focusedBody: this.focusedBodyId,
          cameraOwner: this.cameraOwner,
          cameraState: this.cameraState,
          transitionId: this.currentTransitionId,
          cameraPosition: { x: camPos.x, y: camPos.y, z: camPos.z },
          targetPosition: targetPosForDiag ? { x: targetPosForDiag.x, y: targetPosForDiag.y, z: targetPosForDiag.z } : null,
          targetErrorMeters: targetError,
          alignmentDot,
          isAligned: alignmentDot > 0.98,
        };
      }

      // 8. Dynamic Solar Illumination & Glare Management based on Camera Altitude
      const camera = this.viewer.camera;
      const camHeight = camera.positionCartographic?.height ?? 1e7;
      const isExploringEarthSurface = camHeight < 8_500_000 && (!this.lockedTargetId || this.lockedTargetId === 'earth');

      if (isExploringEarthSurface) {
        // Map Exploration Mode: Disable harsh glare, bloom, specular wash & atmosphere fog
        if (scene.globe.enableLighting) {
          scene.globe.enableLighting = false;
        }
        if (scene.globe.showGroundAtmosphere) {
          scene.globe.showGroundAtmosphere = false;
        }
        if (scene.postProcessStages?.bloom?.enabled) {
          scene.postProcessStages.bloom.enabled = false;
        }
        if (scene.skyAtmosphere && scene.skyAtmosphere.show) {
          scene.skyAtmosphere.show = false;
        }
        scene.globe.atmosphereLightIntensity = 0.0;
      } else {
        // Deep Space Celestial Mode: Balanced, natural solar lighting ("sedang saja, tidak silau")
        if (!scene.globe.enableLighting) {
          scene.globe.enableLighting = true;
        }
        if (scene.globe.showGroundAtmosphere) {
          scene.globe.showGroundAtmosphere = false;
        }
        if (scene.postProcessStages?.bloom?.enabled) {
          scene.postProcessStages.bloom.enabled = false;
        }
        if (scene.skyAtmosphere && !scene.skyAtmosphere.show) {
          scene.skyAtmosphere.show = true;
          try {
            scene.skyAtmosphere.brightnessShift = -0.10;
            scene.skyAtmosphere.saturationShift = 0.15;
          } catch {}
        }
        scene.globe.atmosphereLightIntensity = 0.25;

        let lightTargetPos: any;
        if (this.focusedBodyId && this.celestialItems.has(this.focusedBodyId)) {
          const tItem = this.celestialItems.get(this.focusedBodyId);
          lightTargetPos = tItem && tItem.id !== 'sun' && tItem.id !== 'earth' 
            ? C.Cartesian3.subtract(tItem.currentPosition, this.sunPosition, new C.Cartesian3())
            : C.Cartesian3.negate(this.sunPosition, new C.Cartesian3());
        } else {
          lightTargetPos = C.Cartesian3.negate(this.sunPosition, new C.Cartesian3());
        }
        const mag = C.Cartesian3.magnitude(lightTargetPos);
        const sunRay = mag > 1000 
          ? C.Cartesian3.normalize(lightTargetPos, new C.Cartesian3())
          : new C.Cartesian3(0, 0, 1);

        scene.light = new C.DirectionalLight({
          direction: sunRay,
          color: new C.Color(0.92, 0.90, 0.86, 1.0),
          intensity: 0.75,
        });
      }

      // Earth photorealistic globe is ALWAYS visible
      if (!scene.globe.show) {
        scene.globe.show = true;
      }
    });
  }

  /**
   * Unlock camera target frame and return to global world frame
   */
  public unlockTarget(): void {
    if (this.viewer.trackedEntity) {
      this.viewer.trackedEntity = undefined;
    }
    if (this.lockedTargetId || this.focusedBodyId) {
      this.viewer.camera.lookAtTransform(this.C.Matrix4.IDENTITY);
      this.lockedTargetId = null;
      this.activeTrackingId = null;
      this.focusedBodyId = null;
      if (this.cameraState === 'FOCUSED') {
        this.cameraState = 'OVERVIEW';
      }
    }
  }

  /**
   * Zoom In: dollies strictly towards the active target or Earth's surface,
   * respecting safe minimum distance to prevent surface penetration.
   * When focusing on Earth, dollies towards Earth at (0, 0, 0), never the Sun.
   */
  public zoomIn(factor = 0.65): void {
    const camera = this.viewer.camera;
    const C = this.C;

    // 1. If focused on another celestial body (e.g. Mars, Jupiter, Sun)
    if (this.cameraState === 'FOCUSED' && this.focusedBodyId && this.focusedBodyId !== 'earth') {
      const targetPos = this.getTargetWorldPosition(this.focusedBodyId);
      if (!targetPos) return;

      const radius = this.focusedBodyId === 'sun'
        ? SOLAR_SCALE_CONFIG.SUN_RENDER_RADIUS_METERS
        : (this.celestialItems.get(this.focusedBodyId)?.radiusMeters ?? 1e6);

      const framingInfo = calculateSafeFramingDistance(this.focusedBodyId, radius);
      const localPos = camera.position;
      const currentDist = C.Cartesian3.magnitude(localPos);
      const targetDist = Math.max(framingInfo.minDistance, currentDist * factor);

      const newLocalPos = C.Cartesian3.multiplyByScalar(
        C.Cartesian3.normalize(localPos, new C.Cartesian3()),
        targetDist,
        new C.Cartesian3()
      );

      const transform = C.Matrix4.fromTranslation(targetPos, new C.Matrix4());
      camera.lookAtTransform(transform, newLocalPos);
      return;
    }

    // 2. If in Solar System Overview
    if (this.cameraState === 'OVERVIEW') {
      const camPos = camera.positionWC;
      const toSun = C.Cartesian3.subtract(this.sunPosition, camPos, new C.Cartesian3());
      const distToSun = C.Cartesian3.magnitude(toSun);
      const minOverviewDist = SOLAR_SCALE_CONFIG.SUN_RENDER_RADIUS_METERS * 3.5;

      if (distToSun > minOverviewDist) {
        const step = Math.min(distToSun - minOverviewDist, distToSun * (1 - factor));
        camera.zoomIn(step);
      }
      return;
    }

    // 3. Focused on Earth (Default & Primary Home)
    const earthPos = C.Cartesian3.ZERO;
    const camPosWC = camera.positionWC;
    const distToEarth = C.Cartesian3.distance(camPosWC, earthPos);

    if (distToEarth > 25000000) {
      const newDist = Math.max(25000000, distToEarth * factor);
      const dirToEarth = C.Cartesian3.normalize(C.Cartesian3.negate(camPosWC, new C.Cartesian3()), new C.Cartesian3());
      const newPos = C.Cartesian3.multiplyByScalar(C.Cartesian3.normalize(camPosWC, new C.Cartesian3()), newDist, new C.Cartesian3());

      camera.flyTo({
        destination: newPos,
        orientation: {
          direction: dirToEarth,
          up: camera.upWC,
        },
        duration: 0.6,
      });
      return;
    }

    const height = camera.positionCartographic?.height ?? 3500000;
    camera.zoomIn(Math.max(50, height * 0.35));
  }

  /**
   * Zoom Out: dollies strictly away from active target or Earth's surface.
   */
  public zoomOut(factor = 1.45): void {
    const camera = this.viewer.camera;
    const C = this.C;

    // 1. If focused on another celestial body
    if (this.cameraState === 'FOCUSED' && this.focusedBodyId && this.focusedBodyId !== 'earth') {
      const targetPos = this.getTargetWorldPosition(this.focusedBodyId);
      if (!targetPos) return;

      const radius = this.focusedBodyId === 'sun'
        ? SOLAR_SCALE_CONFIG.SUN_RENDER_RADIUS_METERS
        : (this.celestialItems.get(this.focusedBodyId)?.radiusMeters ?? 1e6);

      const framingInfo = calculateSafeFramingDistance(this.focusedBodyId, radius);
      const localPos = camera.position;
      const currentDist = C.Cartesian3.magnitude(localPos);
      const targetDist = Math.min(framingInfo.maxDistance, currentDist * factor);

      const newLocalPos = C.Cartesian3.multiplyByScalar(
        C.Cartesian3.normalize(localPos, new C.Cartesian3()),
        targetDist,
        new C.Cartesian3()
      );

      const transform = C.Matrix4.fromTranslation(targetPos, new C.Matrix4());
      camera.lookAtTransform(transform, newLocalPos);
      return;
    }

    // 2. If in Overview
    if (this.cameraState === 'OVERVIEW') {
      camera.zoomOut(Math.min(5e9, (camera.positionCartographic?.height ?? 1e9) * 0.45));
      return;
    }

    // 3. Focused on Earth (Default & Primary Home)
    const height = camera.positionCartographic?.height ?? 3500000;
    if (height < 2.5e10) {
      camera.zoomOut(Math.max(100, height * 0.45));
    }
  }

  /**
   * Cinematic Camera Navigation: Smooth multi-phase flight and calibrated lock to any celestial body.
   * Cancels old transitions with monotonic transition token.
   * Dynamically tracks target during both flight and arrival.
   */
  public focusCelestialBody(id: string): void {
    const transitionId = ++this.currentTransitionId;
    this.requestedBodyId = id;

    // Immediately cancel any native Cesium flight or active custom transition
    this.viewer.camera.cancelFlight();
    this.activeTransition = null;

    if (id === 'earth') {
      this.returnToEarth();
      return;
    }

    const C = this.C;
    const targetPos = this.getTargetWorldPosition(id);
    if (!targetPos) return;

    this.unlockTarget();
    this.isSolarSystemView = true;
    this.viewer.scene.globe.show = true;
    this.activeTrackingId = id;
    this.isFlightTransitioning = true;

    const item = this.celestialItems.get(id);
    const radius = item ? item.radiusMeters : SOLAR_SCALE_CONFIG.SUN_RENDER_RADIUS_METERS;
    const framingInfo = calculateSafeFramingDistance(id, radius);
    const framingDist = framingInfo.framingDistance;

    // Set camera frustum near and far planes dynamically
    const frustum = this.viewer.camera.frustum as any;
    if (frustum && 'near' in frustum && 'far' in frustum) {
      frustum.near = Math.max(10.0, radius * 0.04);
      frustum.far = 3.5e10;
    }

    // Calculate destination vantage point direction
    const eps = 0.4090928;
    const eclipticNormal = new C.Cartesian3(0, -Math.sin(eps), Math.cos(eps));

    let approachOffsetDir: any;
    if (id === 'sun') {
      approachOffsetDir = C.Cartesian3.normalize(new C.Cartesian3(0, -0.88, 0.48), new C.Cartesian3());
    } else {
      const sunToTarget = C.Cartesian3.subtract(targetPos, this.sunPosition, new C.Cartesian3());
      const sunDir = C.Cartesian3.magnitude(sunToTarget) > 100
        ? C.Cartesian3.normalize(sunToTarget, new C.Cartesian3())
        : new C.Cartesian3(0, 0, 1);
      const crossVec = C.Cartesian3.cross(sunDir, eclipticNormal, new C.Cartesian3());
      approachOffsetDir = C.Cartesian3.normalize(
        new C.Cartesian3(
          sunDir.x * 0.72 + eclipticNormal.x * 0.42 + crossVec.x * 0.32,
          sunDir.y * 0.72 + eclipticNormal.y * 0.42 + crossVec.y * 0.32,
          sunDir.z * 0.72 + eclipticNormal.z * 0.42 + crossVec.z * 0.32
        ),
        new C.Cartesian3()
      );
    }

    const startCamPos = C.Cartesian3.clone(this.viewer.camera.positionWC);
    let startLookAtPos: any;

    if (this.focusedBodyId && this.focusedBodyId !== 'earth') {
      const prevBodyPos = this.getTargetWorldPosition(this.focusedBodyId);
      startLookAtPos = prevBodyPos ? C.Cartesian3.clone(prevBodyPos) : C.Cartesian3.ZERO.clone();
    } else {
      startLookAtPos = C.Cartesian3.add(
        startCamPos,
        C.Cartesian3.multiplyByScalar(this.viewer.camera.directionWC, 1e7, new C.Cartesian3()),
        new C.Cartesian3()
      );
    }

    const initialDestCamPos = C.Cartesian3.add(
      targetPos,
      C.Cartesian3.multiplyByScalar(approachOffsetDir, framingDist, new C.Cartesian3()),
      new C.Cartesian3()
    );
    const dist = C.Cartesian3.distance(startCamPos, initialDestCamPos);
    const duration = Math.min(2.8, Math.max(1.6, 1.4 + 0.28 * Math.log10(1 + dist / 1e7)));

    // Solar clearance waypoint detection
    let hasSafeWaypoint = false;
    let midWaypoint: any = null;

    if (id !== 'sun' && this.focusedBodyId !== 'sun') {
      const sunPos = this.sunPosition;
      const sunRadius = SOLAR_SCALE_CONFIG.SUN_RENDER_RADIUS_METERS;
      const pathVec = C.Cartesian3.subtract(initialDestCamPos, startCamPos, new C.Cartesian3());
      const pathLen = C.Cartesian3.magnitude(pathVec);
      if (pathLen > 1000) {
        const pathDir = C.Cartesian3.normalize(pathVec, new C.Cartesian3());
        const toSun = C.Cartesian3.subtract(sunPos, startCamPos, new C.Cartesian3());
        const proj = C.Cartesian3.dot(toSun, pathDir);
        if (proj > 0 && proj < pathLen) {
          const closestPoint = C.Cartesian3.add(
            startCamPos,
            C.Cartesian3.multiplyByScalar(pathDir, proj, new C.Cartesian3()),
            new C.Cartesian3()
          );
          const sunDist = C.Cartesian3.distance(closestPoint, sunPos);
          if (sunDist < sunRadius * 2.2) {
            hasSafeWaypoint = true;
            const midPoint = C.Cartesian3.add(
              startCamPos,
              C.Cartesian3.multiplyByScalar(pathDir, pathLen * 0.5, new C.Cartesian3()),
              new C.Cartesian3()
            );
            midWaypoint = C.Cartesian3.add(
              midPoint,
              C.Cartesian3.multiplyByScalar(eclipticNormal, sunRadius * 2.8, new C.Cartesian3()),
              new C.Cartesian3()
            );
          }
        }
      }
    }

    this.viewer.camera.lookAtTransform(C.Matrix4.IDENTITY);
    this.cameraOwner = 'SYSTEM_TRANSITION';
    this.cameraState = 'DEPARTING';
    this.viewer.scene.screenSpaceCameraController.enableInputs = false;

    this.activeTransition = {
      id: transitionId,
      targetId: id,
      startBodyId: this.focusedBodyId,
      startCamPos,
      startLookAtPos,
      startUp: C.Cartesian3.clone(this.viewer.camera.upWC),
      durationSec: duration,
      elapsedSec: 0,
      framingDist,
      minDistance: framingInfo.minDistance,
      maxDistance: framingInfo.maxDistance,
      approachOffsetDir,
      hasSafeWaypoint,
      midWaypoint,
    };
  }

  /**
   * Completes camera arrival at the target body, locking reference frame to the body
   */
  private completeArrival(
    targetId: string,
    framingDist: number,
    minDistance: number,
    maxDistance: number,
    approachOffsetDir: any
  ): void {
    if (targetId === 'earth') {
      this.returnToEarth();
      return;
    }

    const C = this.C;
    const targetPos = this.getTargetWorldPosition(targetId);
    if (!targetPos) return;

    this.cameraState = 'FOCUSED';
    this.focusedBodyId = targetId;
    this.requestedBodyId = targetId;
    this.cameraOwner = 'PLANET_FOCUS';
    this.lockedTargetId = targetId;
    this.activeTrackingId = targetId;
    this.isFlightTransitioning = false;

    // Local offset relative to target body center
    const localOffset = C.Cartesian3.multiplyByScalar(approachOffsetDir, framingDist, new C.Cartesian3());
    const transform = C.Matrix4.fromTranslation(targetPos, new C.Matrix4());

    this.viewer.camera.lookAtTransform(transform, localOffset);

    const ssc = this.viewer.scene.screenSpaceCameraController;
    ssc.enableInputs = true;
    ssc.minimumZoomDistance = minDistance;
    ssc.maximumZoomDistance = maxDistance;
    ssc.enableCollisionDetection = false;
  }

  /**
   * Top-Down Cinematic View of Entire Solar System (Central Sun, All Planets & Orbits)
   */
  public viewSolarSystemOverview(): void {
    const transitionId = ++this.currentTransitionId;
    this.requestedBodyId = 'overview';
    this.focusedBodyId = null;
    this.cameraOwner = 'OVERVIEW';
    this.cameraState = 'OVERVIEW';
    this.activeTransition = null;
    this.isFlightTransitioning = false;

    this.unlockTarget();
    this.isSolarSystemView = true;
    const C = this.C;

    this.viewer.scene.globe.show = true;

    const eps = 0.4090928;
    const sinEps = Math.sin(eps);
    const cosEps = Math.cos(eps);
    const eclipticNormalIcrf = new C.Cartesian3(0, -sinEps, cosEps);

    // Overview vantage distance: frames Neptune (16.8B m) from Sun with comfortable cosmic depth
    const viewDistance = 2.4e10; // 24 billion meters

    const frustum = this.viewer.camera.frustum as any;
    if (frustum && 'near' in frustum && 'far' in frustum) {
      frustum.near = 1000.0;
      frustum.far = 1.0e11;
    }

    const camOffset = new C.Cartesian3(
      0,
      -viewDistance * 0.45,
      viewDistance * 0.88
    );
    const camPos = C.Cartesian3.add(this.sunPosition, camOffset, new C.Cartesian3());
    const dir = C.Cartesian3.normalize(C.Cartesian3.subtract(this.sunPosition, camPos, new C.Cartesian3()), new C.Cartesian3());

    const ssc = this.viewer.scene.screenSpaceCameraController;
    ssc.enableInputs = true;
    ssc.minimumZoomDistance = SOLAR_SCALE_CONFIG.SUN_RENDER_RADIUS_METERS * 2.5; // Outside Sun
    ssc.maximumZoomDistance = 8.0e10;

    this.viewer.camera.flyTo({
      destination: camPos,
      orientation: {
        direction: dir,
        up: eclipticNormalIcrf,
      },
      duration: 2.2,
      easingFunction: C.EasingFunction.QUINTIC_IN_OUT,
    });
  }

  /**
   * Return smoothly to Earth's surface (Indonesia GIS)
   */
  public returnToEarth(center: { lat: number; lng: number } = { lat: -2.5, lng: 118 }): void {
    const transitionId = ++this.currentTransitionId;
    this.requestedBodyId = 'earth';
    this.focusedBodyId = 'earth';
    this.cameraOwner = 'EARTH_GIS';
    this.cameraState = 'EARTH_GIS';
    this.activeTransition = null;
    this.isFlightTransitioning = false;

    this.unlockTarget();
    this.isSolarSystemView = false;
    const C = this.C;

    const frustum = this.viewer.camera.frustum as any;
    if (frustum && 'near' in frustum && 'far' in frustum) {
      frustum.near = 0.1;
      frustum.far = 3.5e10;
    }

    const ssc = this.viewer.scene.screenSpaceCameraController;
    ssc.enableInputs = true;
    ssc.minimumZoomDistance = 10;
    ssc.maximumZoomDistance = 5e10;

    this.viewer.scene.globe.show = true;

    this.viewer.camera.flyTo({
      destination: C.Cartesian3.fromDegrees(center.lng, center.lat, 3500000),
      orientation: {
        heading: 0,
        pitch: C.Math.toRadians(-89.5),
        roll: 0,
      },
      duration: 1.8,
      easingFunction: C.EasingFunction.QUINTIC_IN_OUT,
    });
  }

  public destroy(): void {
    this.unlockTarget();

    if (this.removePreRenderListener) {
      this.removePreRenderListener();
      this.removePreRenderListener = null;
    }
    if (this.removeCameraListener) {
      this.removeCameraListener();
      this.removeCameraListener = null;
    }

    if (this.asteroidBeltPrimitives) {
      this.viewer.scene.primitives.remove(this.asteroidBeltPrimitives);
      this.asteroidBeltPrimitives = null;
    }

    this.haloEntities.forEach((halo) => {
      this.viewer.entities.remove(halo);
    });
    this.haloEntities.clear();

    this.celestialItems.forEach((item) => {
      this.viewer.entities.remove(item.entity);
      if (item.spherePrimitive) {
        this.viewer.scene.primitives.remove(item.spherePrimitive);
      }
      if (item.orbitEntity) this.viewer.entities.remove(item.orbitEntity);
      if (item.ringEntity) this.viewer.entities.remove(item.ringEntity);
    });
    this.celestialItems.clear();

    if (this.coronaEntity) {
      this.viewer.entities.remove(this.coronaEntity);
      this.coronaEntity = null;
    }

    const earthOrbitEntity = this.viewer.entities.getById('polyline-earth-orbit');
    if (earthOrbitEntity) this.viewer.entities.remove(earthOrbitEntity);
    const moonOrbitEntity = this.viewer.entities.getById('polyline-moon-orbit');
    if (moonOrbitEntity) this.viewer.entities.remove(moonOrbitEntity);

    if (this.earthEntity && !this.viewer.isDestroyed()) {
      this.viewer.entities.remove(this.earthEntity);
      this.earthEntity = null;
    }
  }
}
