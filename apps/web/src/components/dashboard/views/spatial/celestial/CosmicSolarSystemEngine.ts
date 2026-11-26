import * as THREE from 'three';
import { 
  PLANETARY_CATALOG, 
  CelestialBodyData, 
  CELESTIAL_ORDER 
} from '@/data/planetaryCatalog';
import { 
  getCelestialTexture, 
  getSaturnRingTexture, 
  createMilkyWayGalaxy, 
  createOrbitLine,
  createAsteroidBelt,
  createAtmosphericRimMaterial,
  createSolarSurfaceMaterial,
  createSolarCoronaMaterial
} from './cosmicSceneUtils';

export interface CelestialItem {
  id: string;
  data: CelestialBodyData;
  mesh: THREE.Mesh | THREE.Group;
  orbitRadius: number;
  orbitSpeed: number;
  rotationSpeed: number;
  currentAngle: number;
  orbitLine?: THREE.LineLoop;
}

export class CosmicSolarSystemEngine {
  public rootGroup: THREE.Group;
  public galaxyGroup: THREE.Group;
  public asteroidBelt: THREE.Points;
  public earthSystemGroup: THREE.Group;
  public sunLight: THREE.PointLight;
  public ambientLight: THREE.AmbientLight;
  public celestialItems: Map<string, CelestialItem> = new Map();
  public clickableMeshes: THREE.Object3D[] = [];

  // Orbit Animation
  public isPaused: boolean = false;
  public speedMultiplier: number = 1.0;
  private earthMesh: THREE.Mesh | null = null;
  private moonMesh: THREE.Mesh | null = null;
  private moonAngle: number = 0;
  private earthAngle: number = 0;
  private solarSurfaceMat: THREE.ShaderMaterial | null = null;
  private solarCoronaMats: THREE.ShaderMaterial[] = [];
  private elapsedTime: number = 0;

  constructor() {
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'CosmicSolarSystemRoot';

    // 1. Milky Way Galaxy & Deep Starfield
    this.galaxyGroup = createMilkyWayGalaxy();
    this.rootGroup.add(this.galaxyGroup);

    // 1b. Main Asteroid Belt between Mars and Jupiter (~240 to ~360 scene units)
    this.asteroidBelt = createAsteroidBelt(240.0, 360.0, 3200);
    this.rootGroup.add(this.asteroidBelt);

    // 2. Central Sun Light & Ambient Fill (expands across 4500 scene units)
    this.sunLight = new THREE.PointLight(0xfff8ee, 4.5, 4500, 0.35);
    this.sunLight.position.set(0, 0, 0);
    this.rootGroup.add(this.sunLight);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.42);
    this.rootGroup.add(this.ambientLight);

    // 3. Earth System Anchor Group (carries Earth + Moon in its orbit)
    this.earthSystemGroup = new THREE.Group();
    this.earthSystemGroup.name = 'EarthSystemGroup';
    this.rootGroup.add(this.earthSystemGroup);

    // 4. Initialize All Celestial Bodies
    this.initCelestialBodies();
  }

  private initCelestialBodies(): void {
    // A. Sun at Origin
    const sunData = PLANETARY_CATALOG['sun'];
    const sunGeo = new THREE.SphereGeometry(sunData.visual.bodyRadius, 64, 64);
    const sunMat = createSolarSurfaceMaterial(getCelestialTexture('sun'));
    this.solarSurfaceMat = sunMat;
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.name = 'celestial_sun';
    sunMesh.userData = { celestialId: 'sun', data: sunData };
    this.rootGroup.add(sunMesh);
    this.clickableMeshes.push(sunMesh);

    // Inner Radiant Corona Layer
    const coronaGeo = new THREE.SphereGeometry(sunData.visual.bodyRadius * 1.28, 40, 40);
    const coronaMat = createSolarCoronaMaterial('#fef08a', 0.58);
    this.solarCoronaMats.push(coronaMat);
    const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
    sunMesh.add(coronaMesh);

    // Outer Diffuse Solar Aura
    const auraGeo = new THREE.SphereGeometry(sunData.visual.bodyRadius * 1.9, 36, 36);
    const auraMat = createSolarCoronaMaterial('#f59e0b', 0.34);
    this.solarCoronaMats.push(auraMat);
    const auraMesh = new THREE.Mesh(auraGeo, auraMat);
    sunMesh.add(auraMesh);

    this.celestialItems.set('sun', {
      id: 'sun',
      data: sunData,
      mesh: sunMesh,
      orbitRadius: 0,
      orbitSpeed: 0,
      rotationSpeed: sunData.visual.rotationSpeed,
      currentAngle: 0,
    });

    // B. Other Planets (Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune)
    const planetIds = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

    planetIds.forEach((id, index) => {
      const data = PLANETARY_CATALOG[id];
      if (!data) return;

      const orbitRadius = data.visual.orbitRadius;
      const bodyRadius = data.visual.bodyRadius;

      // Orbit Line
      const orbitLine = createOrbitLine(orbitRadius, data.visual.accentColor);
      this.rootGroup.add(orbitLine);

      // Planet Mesh (high tessellation for photorealistic surface features)
      const geo = new THREE.SphereGeometry(bodyRadius, 64, 64);
      const planetTex = getCelestialTexture(id);
      const isGasGiant = id === 'jupiter' || id === 'saturn' || id === 'uranus' || id === 'neptune';
      const mat = new THREE.MeshStandardMaterial({
        map: planetTex,
        bumpMap: planetTex,
        bumpScale: isGasGiant ? 0.015 : 0.045,
        roughness: isGasGiant ? 0.72 : 0.88,
        metalness: 0.08,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = `celestial_${id}`;
      mesh.userData = { celestialId: id, data };

      if (id !== 'mercury') {
        const atmoColorMap: Record<string, string> = {
          venus: '#fbbf24',
          mars: '#f97316',
          jupiter: '#fed7aa',
          saturn: '#fde68a',
          uranus: '#67e8f9',
          neptune: '#60a5fa',
        };
        const atmoShell = new THREE.Mesh(
          new THREE.SphereGeometry(bodyRadius * 1.032, 40, 40),
          createAtmosphericRimMaterial(atmoColorMap[id] || data.visual.accentColor, isGasGiant ? 0.72 : 0.85, 3.8)
        );
        mesh.add(atmoShell);
      }

      // Initial orbital offset angle (spaced out so they don't start in a straight line)
      const initialAngle = (index * 1.05) + 0.4;
      mesh.position.set(
        Math.cos(initialAngle) * orbitRadius,
        0,
        Math.sin(initialAngle) * orbitRadius
      );

      // Saturn Rings with Polar Radial UV Mapping (Concentric Circles)
      if (data.visual.hasRings && id === 'saturn') {
        const inner = data.visual.ringInner || (data.visual.bodyRadius * 1.25);
        const outer = data.visual.ringOuter || (data.visual.bodyRadius * 2.35);
        const ringGeo = new THREE.RingGeometry(inner, outer, 128);

        // Convert planar UV coordinates into polar radial coordinates
        const posAttr = ringGeo.attributes.position;
        const uvAttr = ringGeo.attributes.uv;
        for (let i = 0; i < posAttr.count; i++) {
          const x = posAttr.getX(i);
          const y = posAttr.getY(i);
          const dist = Math.sqrt(x * x + y * y);
          const u = (dist - inner) / (outer - inner);
          uvAttr.setXY(i, u, 0.5);
        }
        uvAttr.needsUpdate = true;

        // Align ring to horizontal plane
        ringGeo.rotateX(Math.PI / 2);

        const ringMat = new THREE.MeshStandardMaterial({
          map: getSaturnRingTexture(),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.95,
          roughness: 0.7,
        });

        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        // Tilt Saturn's axis by ~26.7°
        ringMesh.rotation.z = (26.73 * Math.PI) / 180;
        mesh.add(ringMesh);
      }

      // Uranus faint rings
      if (data.visual.hasRings && id === 'uranus') {
        const ringGeo = new THREE.RingGeometry(data.visual.ringInner || 1.45, data.visual.ringOuter || 1.95, 48);
        ringGeo.rotateX(Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x22d3ee,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.35,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = (97.77 * Math.PI) / 180;
        mesh.add(ringMesh);
      }

      this.rootGroup.add(mesh);
      this.clickableMeshes.push(mesh);

      this.celestialItems.set(id, {
        id,
        data,
        mesh,
        orbitRadius,
        orbitSpeed: data.visual.orbitSpeed,
        rotationSpeed: data.visual.rotationSpeed,
        currentAngle: initialAngle,
        orbitLine,
      });
    });

    // C. Earth Orbit Line
    const earthData = PLANETARY_CATALOG['earth'];
    const earthOrbitLine = createOrbitLine(earthData.visual.orbitRadius, earthData.visual.accentColor);
    this.rootGroup.add(earthOrbitLine);

    // Initial Earth Position
    this.earthAngle = 1.8;
    this.earthSystemGroup.position.set(
      Math.cos(this.earthAngle) * earthData.visual.orbitRadius,
      0,
      Math.sin(this.earthAngle) * earthData.visual.orbitRadius
    );

    // D. Moon Orbiting Earth
    const moonData = PLANETARY_CATALOG['moon'];
    const moonOrbitLine = createOrbitLine(moonData.visual.orbitRadius, '#94a3b8');
    moonOrbitLine.scale.set(1, 1, 1);
    this.earthSystemGroup.add(moonOrbitLine);

    const moonGeo = new THREE.SphereGeometry(moonData.visual.bodyRadius, 48, 48);
    const moonMat = new THREE.MeshStandardMaterial({
      map: getCelestialTexture('moon'),
      roughness: 0.9,
    });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.moonMesh.name = 'celestial_moon';
    this.moonMesh.userData = { celestialId: 'moon', data: moonData };
    this.earthSystemGroup.add(this.moonMesh);
    this.clickableMeshes.push(this.moonMesh);

    this.celestialItems.set('moon', {
      id: 'moon',
      data: moonData,
      mesh: this.moonMesh,
      orbitRadius: moonData.visual.orbitRadius,
      orbitSpeed: moonData.visual.orbitSpeed,
      rotationSpeed: moonData.visual.rotationSpeed,
      currentAngle: 0,
      orbitLine: moonOrbitLine,
    });
  }

  /**
   * Attaches the primary Earth globe mesh and its atmosphere/clouds into the Earth System group
   */
  public attachEarthGlobe(globeMesh: THREE.Mesh): void {
    this.earthMesh = globeMesh;
    globeMesh.userData = { celestialId: 'earth', data: PLANETARY_CATALOG['earth'] };
    this.earthSystemGroup.add(globeMesh);
    this.clickableMeshes.push(globeMesh);

    this.celestialItems.set('earth', {
      id: 'earth',
      data: PLANETARY_CATALOG['earth'],
      mesh: this.earthSystemGroup,
      orbitRadius: PLANETARY_CATALOG['earth'].visual.orbitRadius,
      orbitSpeed: PLANETARY_CATALOG['earth'].visual.orbitSpeed,
      rotationSpeed: PLANETARY_CATALOG['earth'].visual.rotationSpeed,
      currentAngle: this.earthAngle,
    });
  }

  /**
   * Update all celestial orbital revolutions, rotations, and galactic drift
   */
  public update(delta: number = 0.016): void {
    const safeDelta = Math.min(0.1, Math.max(0.0, delta));
    const dtScale = safeDelta * 60;
    this.elapsedTime += safeDelta;

    if (this.solarSurfaceMat) {
      this.solarSurfaceMat.uniforms.uTime.value = this.elapsedTime;
    }
    for (const cMat of this.solarCoronaMats) {
      cMat.uniforms.uTime.value = this.elapsedTime;
    }

    // 1. Slow majestic rotation of the Milky Way Galaxy
    if (this.galaxyGroup) {
      this.galaxyGroup.rotation.y += 0.00015 * dtScale;
    }

    // 1b. Keplerian rotation of the Main Asteroid Belt
    if (this.asteroidBelt && !this.isPaused) {
      this.asteroidBelt.rotation.y += 0.00035 * this.speedMultiplier * dtScale;
    }

    if (this.isPaused) return;

    const effectiveSpeed = 0.04 * this.speedMultiplier * dtScale;

    // 2. Planets orbiting Sun
    this.celestialItems.forEach((item) => {
      if (item.id === 'sun' || item.id === 'earth' || item.id === 'moon') return;

      item.currentAngle += item.orbitSpeed * effectiveSpeed;
      const x = Math.cos(item.currentAngle) * item.orbitRadius;
      const z = Math.sin(item.currentAngle) * item.orbitRadius;
      item.mesh.position.set(x, 0, z);

      // Axial rotation normalized to frame time
      item.mesh.rotation.y += item.rotationSpeed * dtScale;
    });

    // 3. Earth System Orbit around Sun
    const earthItem = this.celestialItems.get('earth');
    if (earthItem) {
      this.earthAngle += earthItem.orbitSpeed * effectiveSpeed;
      earthItem.currentAngle = this.earthAngle;
      const earthX = Math.cos(this.earthAngle) * earthItem.orbitRadius;
      const earthZ = Math.sin(this.earthAngle) * earthItem.orbitRadius;
      this.earthSystemGroup.position.set(earthX, 0, earthZ);
    }

    // 4. Moon Orbit around Earth
    if (this.moonMesh) {
      const moonData = PLANETARY_CATALOG['moon'];
      this.moonAngle += moonData.visual.orbitSpeed * effectiveSpeed * 1.5;
      const moonX = Math.cos(this.moonAngle) * moonData.visual.orbitRadius;
      const moonZ = Math.sin(this.moonAngle) * moonData.visual.orbitRadius;
      const moonY = Math.sin(this.moonAngle) * 0.25; // Subtle 5° inclination
      this.moonMesh.position.set(moonX, moonY, moonZ);
      this.moonMesh.rotation.y += 0.008 * dtScale;
    }

    // 5. Sun axial rotation
    const sunItem = this.celestialItems.get('sun');
    if (sunItem) {
      sunItem.mesh.rotation.y += 0.001 * dtScale;
    }
  }

  /**
   * Retrieves world position of any celestial body for camera targeting
   */
  public getCelestialWorldPosition(
    id: string,
    target: THREE.Vector3 = new THREE.Vector3()
  ): THREE.Vector3 {
    if (id === 'earth') {
      this.earthSystemGroup.getWorldPosition(target);
      return target;
    }

    if (id === 'moon' && this.moonMesh) {
      this.moonMesh.getWorldPosition(target);
      return target;
    }

    const item = this.celestialItems.get(id);
    if (item) {
      item.mesh.getWorldPosition(target);
      return target;
    }

    return target.set(0, 0, 0);
  }

  /**
   * Cleans up textures, geometries, and materials
   */
  public dispose(): void {
    this.rootGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material?.dispose();
        }
      }
    });
  }
}
