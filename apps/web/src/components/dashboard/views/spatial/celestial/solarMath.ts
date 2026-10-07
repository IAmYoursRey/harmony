/**
 * Mathematical 3D Spatial Reasoning & Scale Engine for Solar System / Celestial Space
 *
 * Implements a scientifically grounded Dual-Scale System:
 * 1. Physical ground-truth astronomical data (NASA JPL ephemeris & fact sheets)
 * 2. Body Visual Scale: Monotonic power-law scaling ensuring true perceptual hierarchy
 *    SUN >>>>>>>> JUPITER >>> SATURN >> URANUS / NEPTUNE > EARTH / VENUS > MARS > MERCURY > MOON
 * 3. Orbit Visual Scale: Monotonic distance compression preserving realistic spacing,
 *    inner-planet clarity, asteroid belt gap, and vast outer solar system depth.
 */

export const ASTRONOMICAL_CONSTANTS = {
  /** 1 Astronomical Unit (AU) in meters */
  AU_METERS: 149597870700,
  /** Speed of light in m/s */
  SPEED_OF_LIGHT_MPS: 299792458,
  /** Earth mean radius in meters */
  EARTH_PHYSICAL_RADIUS_METERS: 6371000,
  /** Sun physical radius in meters (109.3x Earth) */
  SUN_PHYSICAL_RADIUS_METERS: 696340000,
  /** Jupiter physical radius in meters (10.97x Earth) */
  JUPITER_PHYSICAL_RADIUS_METERS: 69911000,
  /** Saturn physical radius in meters (9.14x Earth) */
  SATURN_PHYSICAL_RADIUS_METERS: 58232000,
  /** Saturn outer ring radius in meters (~2.4x Saturn radius) */
  SATURN_RING_OUTER_METERS: 140000000,
  /** Uranus physical radius in meters */
  URANUS_PHYSICAL_RADIUS_METERS: 25362000,
  /** Neptune physical radius in meters */
  NEPTUNE_PHYSICAL_RADIUS_METERS: 24622000,
  /** Venus physical radius in meters */
  VENUS_PHYSICAL_RADIUS_METERS: 6051800,
  /** Mars physical radius in meters */
  MARS_PHYSICAL_RADIUS_METERS: 3389500,
  /** Mercury physical radius in meters */
  MERCURY_PHYSICAL_RADIUS_METERS: 2439700,
  /** Moon physical radius in meters */
  MOON_PHYSICAL_RADIUS_METERS: 1737400,
} as const;

/**
 * Centrally Managed Visual Scale Configuration
 * Designed to provide cinematic grandeur, comfortable web navigation,
 * and unambiguous celestial class distinction.
 */
export const SOLAR_SCALE_CONFIG = {
  /** Base render radius for Earth in visual meters (matches physical WGS84 radius) */
  EARTH_RENDER_RADIUS_METERS: 6371000, // 6,371 km
  /** Monotonic power-law exponent for planetary body sizing (alpha: 0.50 - 0.60) */
  BODY_SCALE_EXPONENT: 0.58,
  /**
   * Sun Visual Radius: Monumental stellar presence (180,000 km, ~28.2x Earth radius, ~7x Jupiter, >22,000x Earth volume).
   * Truly dominates the center of the solar system as an awe-inspiring primary star.
   */
  SUN_RENDER_RADIUS_METERS: 180000000, // 180,000 km (28.2x Earth, 7x Jupiter)
  /** Base orbit distance at 1.0 AU (Earth orbit) in visual meters: generous cosmic depth */
  ORBIT_BASE_DISTANCE_METERS: 1450000000, // 1.45 billion meters (1.45 million km)
  /** Monotonic orbit distance compression exponent (beta: 0.65 - 0.80) */
  ORBIT_DISTANCE_EXPONENT: 0.72,
  /** Moon orbit radius around Earth in visual meters */
  MOON_ORBIT_RADIUS_METERS: 24000000, // 24 million meters (24,000 km)
  /** Minimum safe camera factor relative to bounding radius (prevents mesh penetration) */
  CAMERA_MIN_SAFE_FACTOR: 1.28,
  /** Optimal framing multiplier for comfortable view */
  CAMERA_FRAMING_MULTIPLIER: 3.2,
  /** Additional ring padding for Saturn */
  SATURN_RING_FRAMING_MULTIPLIER: 1.45,
} as const;

/**
 * Calculates the monotonic visual render radius for any celestial body
 * preserving physical monotonicity:
 * r_render = R_base * (r_phys / r_earth)^alpha
 */
export function calculateRenderRadius(
  id: string,
  physicalRadiusMeters: number
): number {
  if (id === 'sun') {
    return SOLAR_SCALE_CONFIG.SUN_RENDER_RADIUS_METERS;
  }

  const ratio = physicalRadiusMeters / ASTRONOMICAL_CONSTANTS.EARTH_PHYSICAL_RADIUS_METERS;
  const scaled = SOLAR_SCALE_CONFIG.EARTH_RENDER_RADIUS_METERS * Math.pow(ratio, SOLAR_SCALE_CONFIG.BODY_SCALE_EXPONENT);

  // Round to nearest 1,000 meters for clean GPU buffer precision
  return Math.round(scaled / 1000) * 1000;
}

/**
 * Calculates the monotonic visual orbit distance for any body given semi-major axis in AU:
 * d_render = D_base * (AU)^beta
 */
export function calculateRenderOrbitDistance(semiMajorAxisAU: number): number {
  if (semiMajorAxisAU <= 0) return 0;
  const compressed = SOLAR_SCALE_CONFIG.ORBIT_BASE_DISTANCE_METERS * Math.pow(semiMajorAxisAU, SOLAR_SCALE_CONFIG.ORBIT_DISTANCE_EXPONENT);
  return Math.round(compressed / 10000) * 10000;
}

/**
 * Calculates the true visual bounding radius of a celestial body,
 * taking planetary ring systems into account.
 */
export function getCelestialBoundingRadius(id: string, bodyRadiusMeters: number): number {
  if (id === 'saturn') {
    // Saturn ring outer edge extends ~2.4x beyond equatorial radius
    return bodyRadiusMeters * 2.45;
  }
  if (id === 'uranus') {
    return bodyRadiusMeters * 1.55;
  }
  return bodyRadiusMeters;
}

/**
 * Calculates optimal camera framing distance based on object bounding radius and FOV.
 * Uses the mathematical relation: distance = boundingRadius / tan(FOV / 2) * framingMultiplier
 */
export function calculateSafeFramingDistance(
  id: string,
  bodyRadiusMeters: number,
  fovDeg: number = 60
): {
  minDistance: number;
  framingDistance: number;
  maxDistance: number;
  boundingRadius: number;
} {
  const boundingRadius = getCelestialBoundingRadius(id, bodyRadiusMeters);
  const fovRad = (fovDeg * Math.PI) / 180;
  const baseDistance = boundingRadius / Math.tan(fovRad / 2);

  const multiplier = id === 'saturn' 
    ? SOLAR_SCALE_CONFIG.CAMERA_FRAMING_MULTIPLIER * SOLAR_SCALE_CONFIG.SATURN_RING_FRAMING_MULTIPLIER
    : id === 'sun'
    ? 2.8
    : SOLAR_SCALE_CONFIG.CAMERA_FRAMING_MULTIPLIER;

  const framingDistance = baseDistance * multiplier;
  const minDistance = boundingRadius * SOLAR_SCALE_CONFIG.CAMERA_MIN_SAFE_FACTOR;
  const maxDistance = framingDistance * 40;

  return {
    minDistance,
    framingDistance,
    maxDistance,
    boundingRadius,
  };
}

/**
 * Dynamic Near / Far frustum calculation based on current camera distance
 * Prevents z-fighting and near-plane clipping across 8 orders of magnitude
 */
export function calculateCameraFrustum(
  cameraDistance: number,
  targetRadius: number
): { near: number; far: number } {
  // Near plane should never clip near object surface
  const near = Math.max(10.0, Math.min(cameraDistance * 0.01, targetRadius * 0.05));
  // Far plane encompasses the entire visible solar system scale from current vantage
  const far = Math.max(cameraDistance * 10.0, 3.5e10);
  return { near, far };
}

/**
 * Validates mathematical invariants required by the Master Specification:
 * 1. Size Monotonicity: Sun >> Jupiter > Saturn > Uranus > Neptune > Earth > Venus > Mars > Mercury > Moon
 * 2. Distance Monotonicity: Neptune > Uranus > Saturn > Jupiter > Mars > Earth > Venus > Mercury
 * 3. Spatial Separation: Mercury distance > Sun radius + safeGap
 */
export function validateMathematicalInvariants(): {
  isValid: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  const bodies = [
    { id: 'sun', physR: ASTRONOMICAL_CONSTANTS.SUN_PHYSICAL_RADIUS_METERS, au: 0 },
    { id: 'mercury', physR: ASTRONOMICAL_CONSTANTS.MERCURY_PHYSICAL_RADIUS_METERS, au: 0.387098 },
    { id: 'venus', physR: ASTRONOMICAL_CONSTANTS.VENUS_PHYSICAL_RADIUS_METERS, au: 0.723332 },
    { id: 'earth', physR: ASTRONOMICAL_CONSTANTS.EARTH_PHYSICAL_RADIUS_METERS, au: 1.000000 },
    { id: 'moon', physR: ASTRONOMICAL_CONSTANTS.MOON_PHYSICAL_RADIUS_METERS, au: 1.000000 },
    { id: 'mars', physR: ASTRONOMICAL_CONSTANTS.MARS_PHYSICAL_RADIUS_METERS, au: 1.523679 },
    { id: 'jupiter', physR: ASTRONOMICAL_CONSTANTS.JUPITER_PHYSICAL_RADIUS_METERS, au: 5.204400 },
    { id: 'saturn', physR: ASTRONOMICAL_CONSTANTS.SATURN_PHYSICAL_RADIUS_METERS, au: 9.582600 },
    { id: 'uranus', physR: ASTRONOMICAL_CONSTANTS.URANUS_PHYSICAL_RADIUS_METERS, au: 19.218400 },
    { id: 'neptune', physR: ASTRONOMICAL_CONSTANTS.NEPTUNE_PHYSICAL_RADIUS_METERS, au: 30.070000 },
  ];

  const renderRadii = new Map<string, number>();
  const renderDistances = new Map<string, number>();

  bodies.forEach((b) => {
    renderRadii.set(b.id, calculateRenderRadius(b.id, b.physR));
    renderDistances.set(b.id, calculateRenderOrbitDistance(b.au));
  });

  // 1. Sun Monumentality
  const sunR = renderRadii.get('sun')!;
  const jupR = renderRadii.get('jupiter')!;
  if (sunR <= jupR * 3.0) {
    violations.push(`Sun render radius (${sunR}) must be at least 3x Jupiter (${jupR})`);
  }

  // 2. Planet Size Hierarchy
  const sizeChain = ['jupiter', 'saturn', 'uranus', 'neptune', 'earth', 'mars', 'mercury', 'moon'];
  for (let i = 0; i < sizeChain.length - 1; i++) {
    const a = sizeChain[i];
    const b = sizeChain[i + 1];
    const rA = renderRadii.get(a)!;
    const rB = renderRadii.get(b)!;
    if (rA <= rB) {
      violations.push(`Size hierarchy violated: ${a} (${rA}) must be > ${b} (${rB})`);
    }
  }

  // 3. Orbit Distance Hierarchy
  const orbitChain = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
  for (let i = 0; i < orbitChain.length - 1; i++) {
    const a = orbitChain[i];
    const b = orbitChain[i + 1];
    const dA = renderDistances.get(a)!;
    const dB = renderDistances.get(b)!;
    if (dA >= dB) {
      violations.push(`Orbit distance violated: ${a} (${dA}) must be < ${b} (${dB})`);
    }
  }

  // 4. Mercury Sun Clearance
  const dMerc = renderDistances.get('mercury')!;
  const rMerc = renderRadii.get('mercury')!;
  if (dMerc <= sunR + rMerc + 50000000) {
    violations.push(`Mercury (${dMerc}) too close to Sun surface (${sunR})`);
  }

  return {
    isValid: violations.length === 0,
    violations,
  };
}
