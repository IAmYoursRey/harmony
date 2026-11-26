import * as THREE from 'three';
import {
  PLANETARY_CATALOG,
  CelestialBodyData,
} from '@/data/planetaryCatalog';
import {
  getCelestialTexture,
  getSaturnRingTexture,
  getSolarFlareTexture,
  createMilkyWayGalaxy,
  createOrbitLine,
  createAsteroidBelt,
  createInstancedAsteroidBelt,
  createAtmosphericRimMaterial,
  createAAAPlanetMaterial,
  createSaturnRingMaterial,
  createSolarSurfaceMaterial,
  createSolarCoronaMaterial,
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

interface SubMoonOrbit {
  mesh: THREE.Mesh;
  radius: number;
  speed: number;
  angle: number;
  inclination: number;
}

export class CosmicSolarSystemEngine {
  public rootGroup: THREE.Group;
  public galaxyGroup: THREE.Group;
  public asteroidBelt: THREE.Points;
  public asteroidBoulders: THREE.InstancedMesh;
  public earthSystemGroup: THREE.Group;
  public sunLight: THREE.PointLight;
  public ambientLight: THREE.AmbientLight;
  public celestialItems: Map<string, CelestialItem> = new Map();
  public clickableMeshes: THREE.Object3D[] = [];

  public isPaused: boolean = false;
  public speedMultiplier: number = 1.0;
  private earthMesh: THREE.Mesh | null = null;
  private moonMesh: THREE.Mesh | null = null;
  private moonAngle: number = 0;
  private earthAngle: number = 0;
  private solarSurfaceMat: THREE.ShaderMaterial | null = null;
  private solarCoronaMats: THREE.ShaderMaterial[] = [];
  private planetShaderMats: THREE.ShaderMaterial[] = [];
  private subMoons: SubMoonOrbit[] = [];
  private elapsedTime: number = 0;

  constructor() {
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'CosmicSolarSystemRoot';

    // 1. Milky Way SkyDome & Parallax Galactic Clusters
    this.galaxyGroup = createMilkyWayGalaxy();
    this.rootGroup.add(this.galaxyGroup);

    // 1b. Main Asteroid Belt (3D faceted boulders + circular micro-dust particles)
    this.asteroidBoulders = createInstancedAsteroidBelt(242.0, 358.0, 680);
    this.rootGroup.add(this.asteroidBoulders);

    this.asteroidBelt = createAsteroidBelt(236.0, 364.0, 1800);
    this.rootGroup.add(this.asteroidBelt);

    // 2. Central Sun Light & Deep Space Ambient Fill
    this.sunLight = new THREE.PointLight(0xfff6e5, 4.2, 6500, 0.12);
    this.sunLight.position.set(0, 0, 0);
    this.rootGroup.add(this.sunLight);

    this.ambientLight = new THREE.AmbientLight(0x9bb8ff, 0.28);
    this.rootGroup.add(this.ambientLight);

    // 3. Earth System Anchor Group (carries Earth + Moon in its orbit)
    this.earthSystemGroup = new THREE.Group();
    this.earthSystemGroup.name = 'EarthSystemGroup';
    this.rootGroup.add(this.earthSystemGroup);

    // 4. Initialize All Celestial Bodies
    this.initCelestialBodies();
  }

  private addSatelliteMoons(parentPlanet: THREE.Object3D, defs: Array<{ radius: number; dist: number; speed: number; color: number; inc: number; angle: number }>): void {
    defs.forEach((def) => {
      const orbitLoop = createOrbitLine(def.dist, '#94a3b8');
      orbitLoop.rotation.x = def.inc;
      parentPlanet.add(orbitLoop);

      const mGeo = new THREE.SphereGeometry(def.radius, 20, 20);
      const mMat = new THREE.MeshStandardMaterial({
        color: def.color,
        roughness: 0.88,
        metalness: 0.05,
      });
      const mMesh = new THREE.Mesh(mGeo, mMat);
      mMesh.position.set(Math.cos(def.angle) * def.dist, 0, Math.sin(def.angle) * def.dist);
      parentPlanet.add(mMesh);

      this.subMoons.push({
        mesh: mMesh,
        radius: def.dist,
        speed: def.speed,
        angle: def.angle,
        inclination: def.inc,
      });
    });
  }

  private initCelestialBodies(): void {
    const sunOrigin = new THREE.Vector3(0, 0, 0);

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

    // Inner Chromospheric Corona
    const coronaGeo = new THREE.SphereGeometry(sunData.visual.bodyRadius * 1.38, 48, 48);
    const coronaMat = createSolarCoronaMaterial('#fef08a', 1.05);
    this.solarCoronaMats.push(coronaMat);
    sunMesh.add(new THREE.Mesh(coronaGeo, coronaMat));

    // Outer Diffuse Solar Aura
    const auraGeo = new THREE.SphereGeometry(sunData.visual.bodyRadius * 2.15, 40, 40);
    const auraMat = createSolarCoronaMaterial('#f97316', 0.48);
    this.solarCoronaMats.push(auraMat);
    sunMesh.add(new THREE.Mesh(auraGeo, auraMat));

    // Anamorphic Solar Flare Sprite
    const flareMat = new THREE.SpriteMaterial({
      map: getSolarFlareTexture(),
      color: 0xffedd5,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const flareSprite = new THREE.Sprite(flareMat);
    flareSprite.scale.set(sunData.visual.bodyRadius * 6.2, sunData.visual.bodyRadius * 3.4, 1);
    sunMesh.add(flareSprite);

    this.celestialItems.set('sun', {
      id: 'sun',
      data: sunData,
      mesh: sunMesh,
      orbitRadius: 0,
      orbitSpeed: 0,
      rotationSpeed: sunData.visual.rotationSpeed,
      currentAngle: 0,
    });

    // B. Other Planets
    const planetIds = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
    const atmoColorMap: Record<string, string> = {
      venus: '#fbbf24',
      mars: '#fb923c',
      jupiter: '#fed7aa',
      saturn: '#fde68a',
      uranus: '#67e8f9',
      neptune: '#60a5fa',
    };
    const twilightMap: Record<string, string> = {
      venus: '#ea580c',
      mars: '#f97316',
      jupiter: '#d97706',
      saturn: '#ca8a04',
      uranus: '#22d3ee',
      neptune: '#38bdf8',
    };

    planetIds.forEach((id, index) => {
      const data = PLANETARY_CATALOG[id];
      if (!data) return;

      const orbitRadius = data.visual.orbitRadius;
      const bodyRadius = data.visual.bodyRadius;
      const isGasGiant = id === 'jupiter' || id === 'saturn' || id === 'uranus' || id === 'neptune';

      const orbitLine = createOrbitLine(orbitRadius, data.visual.accentColor);
      this.rootGroup.add(orbitLine);

      const geo = new THREE.SphereGeometry(bodyRadius, 64, 64);
      const planetTex = getCelestialTexture(id);
      const mat = createAAAPlanetMaterial(planetTex, {
        bodyId: id,
        sunPosition: sunOrigin,
        atmoColor: atmoColorMap[id] || data.visual.accentColor,
        isGasGiant,
      });
      this.planetShaderMats.push(mat);

      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = `celestial_${id}`;
      mesh.userData = { celestialId: id, data };

      if (id !== 'mercury') {
        const atmoShell = new THREE.Mesh(
          new THREE.SphereGeometry(bodyRadius * 1.12, 48, 48),
          createAtmosphericRimMaterial(
            atmoColorMap[id] || data.visual.accentColor,
            isGasGiant ? 0.85 : 1.05,
            2.4,
            { sunPosition: sunOrigin, twilightColor: twilightMap[id], limbRatio: 1.12 }
          )
        );
        mesh.add(atmoShell);
      }

      const initialAngle = index * 1.05 + 0.4;
      mesh.position.set(
        Math.cos(initialAngle) * orbitRadius,
        0,
        Math.sin(initialAngle) * orbitRadius
      );

      // Saturn Rings with Ray-Traced Planetary Umbra Shadow
      if (data.visual.hasRings && id === 'saturn') {
        const inner = data.visual.ringInner || bodyRadius * 1.25;
        const outer = data.visual.ringOuter || bodyRadius * 2.35;
        const ringGeo = new THREE.RingGeometry(inner, outer, 144);

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
        ringGeo.rotateX(Math.PI / 2);

        const ringMat = createSaturnRingMaterial(getSaturnRingTexture(), bodyRadius, sunOrigin);
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.z = (26.73 * Math.PI) / 180;
        mesh.add(ringMesh);

        // Titan orbiting Saturn outside F-ring
        this.addSatelliteMoons(mesh, [
          { radius: bodyRadius * 0.085, dist: outer * 1.26, speed: 0.032, color: 0xf59e0b, inc: 0.06, angle: 1.2 },
          { radius: bodyRadius * 0.042, dist: outer * 1.09, speed: 0.055, color: 0xe2e8f0, inc: 0.02, angle: 3.8 },
        ]);
      }

      if (id === 'jupiter') {
        // Four Galilean Moons: Io, Europa, Ganymede, Callisto
        this.addSatelliteMoons(mesh, [
          { radius: bodyRadius * 0.055, dist: bodyRadius * 1.48, speed: 0.068, color: 0xfacc15, inc: 0.02, angle: 0.4 },
          { radius: bodyRadius * 0.048, dist: bodyRadius * 1.78, speed: 0.048, color: 0xe2e8f0, inc: -0.03, angle: 2.1 },
          { radius: bodyRadius * 0.072, dist: bodyRadius * 2.15, speed: 0.032, color: 0xcbd5e1, inc: 0.04, angle: 4.3 },
          { radius: bodyRadius * 0.064, dist: bodyRadius * 2.65, speed: 0.022, color: 0x94a3b8, inc: -0.02, angle: 5.5 },
        ]);
      }

      if (data.visual.hasRings && id === 'uranus') {
        const ringGeo = new THREE.RingGeometry(data.visual.ringInner || 1.45, data.visual.ringOuter || 1.95, 64);
        ringGeo.rotateX(Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x67e8f9,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.28,
          depthWrite: false,
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

    this.earthAngle = 1.8;
    this.earthSystemGroup.position.set(
      Math.cos(this.earthAngle) * earthData.visual.orbitRadius,
      0,
      Math.sin(this.earthAngle) * earthData.visual.orbitRadius
    );

    // D. Moon Orbiting Earth
    const moonData = PLANETARY_CATALOG['moon'];
    const moonOrbitLine = createOrbitLine(moonData.visual.orbitRadius, '#94a3b8');
    this.earthSystemGroup.add(moonOrbitLine);

    const moonGeo = new THREE.SphereGeometry(moonData.visual.bodyRadius, 48, 48);
    const moonMat = createAAAPlanetMaterial(getCelestialTexture('moon'), {
      bodyId: 'moon',
      sunPosition: sunOrigin,
      atmoColor: '#cbd5e1',
      isGasGiant: false,
    });
    this.planetShaderMats.push(moonMat);
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
    for (const pMat of this.planetShaderMats) {
      if (pMat.uniforms.uTime) pMat.uniforms.uTime.value = this.elapsedTime;
    }

    if (this.galaxyGroup) {
      this.galaxyGroup.rotation.y += 0.00008 * dtScale;
    }

    if (!this.isPaused) {
      if (this.asteroidBelt) {
        this.asteroidBelt.rotation.y += 0.00032 * this.speedMultiplier * dtScale;
      }
      if (this.asteroidBoulders) {
        this.asteroidBoulders.rotation.y += 0.00032 * this.speedMultiplier * dtScale;
      }
    }

    if (this.isPaused) return;

    const effectiveSpeed = 0.04 * this.speedMultiplier * dtScale;

    this.celestialItems.forEach((item) => {
      if (item.id === 'sun' || item.id === 'earth' || item.id === 'moon') return;

      item.currentAngle += item.orbitSpeed * effectiveSpeed;
      item.mesh.position.set(
        Math.cos(item.currentAngle) * item.orbitRadius,
        0,
        Math.sin(item.currentAngle) * item.orbitRadius
      );
      item.mesh.rotation.y += item.rotationSpeed * dtScale;
    });

    // Sub-moons (Galilean moons & Titan)
    for (const sm of this.subMoons) {
      sm.angle += sm.speed * effectiveSpeed * 2.2;
      sm.mesh.position.set(
        Math.cos(sm.angle) * sm.radius,
        Math.sin(sm.angle) * sm.radius * Math.sin(sm.inclination),
        Math.sin(sm.angle) * sm.radius
      );
    }

    const earthItem = this.celestialItems.get('earth');
    if (earthItem) {
      this.earthAngle += earthItem.orbitSpeed * effectiveSpeed;
      earthItem.currentAngle = this.earthAngle;
      this.earthSystemGroup.position.set(
        Math.cos(this.earthAngle) * earthItem.orbitRadius,
        0,
        Math.sin(this.earthAngle) * earthItem.orbitRadius
      );
    }

    if (this.moonMesh) {
      const moonData = PLANETARY_CATALOG['moon'];
      this.moonAngle += moonData.visual.orbitSpeed * effectiveSpeed * 1.5;
      this.moonMesh.position.set(
        Math.cos(this.moonAngle) * moonData.visual.orbitRadius,
        Math.sin(this.moonAngle) * 0.25,
        Math.sin(this.moonAngle) * moonData.visual.orbitRadius
      );
      this.moonMesh.rotation.y += 0.008 * dtScale;
    }

    const sunItem = this.celestialItems.get('sun');
    if (sunItem) {
      sunItem.mesh.rotation.y += 0.001 * dtScale;
    }
  }

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

  public dispose(): void {
    this.rootGroup.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Points || child instanceof THREE.Line || child instanceof THREE.Sprite) {
        if ('geometry' in child && child.geometry) {
          child.geometry.dispose();
        }
        const mat = child.material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => m.dispose());
        } else if (mat) {
          mat.dispose();
        }
      }
    });
  }
}
