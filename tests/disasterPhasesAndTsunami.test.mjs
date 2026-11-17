import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveDisasterStrategy,
  resolveActiveDisasterPhase,
} from "../apps/web/src/components/dashboard/views/spatial/digital-twin/disasterStrategyRules.ts";
import { buildSman1NgoroPdfDigitalTwin } from "../apps/server/src/data/sman1NgoroPdfMapBuilder.js";

test("Earthquake disaster lifecycle has P-wave, Severe Shaking (Drop, Cover, Hold On), Golden Window, and Aftershocks", () => {
  const strategy = resolveDisasterStrategy("Gempa", "Gempa Bumi Tektonik");
  assert.equal(strategy.key, "EARTHQUAKE");
  assert.ok(strategy.phases.length >= 4, "Earthquake must have at least 4 distinct phases");

  // 1. Initial P-wave tremor (at 2 seconds)
  const pWave = resolveActiveDisasterPhase(strategy, 2000);
  assert.equal(pWave.phaseId, "EARTHQUAKE_P_WAVE");
  assert.equal(pWave.phaseIndex, 1);
  assert.equal(pWave.isSevereShaking, false);
  assert.equal(pWave.requiresCover, false);
  assert.ok(pWave.remainingInPhaseSec > 0 && pWave.remainingInPhaseSec <= 6);

  // 2. Severe Shaking (S-wave at 12 seconds, 6s in phase)
  const severe = resolveActiveDisasterPhase(strategy, 12000);
  assert.equal(severe.phaseId, "EARTHQUAKE_SEVERE_SHAKING");
  assert.equal(severe.phaseIndex, 2);
  assert.equal(severe.isSevereShaking, true);
  assert.equal(severe.requiresCover, true);
  assert.match(severe.instructionText, /DROP, COVER, HOLD ON/i);
  assert.equal(severe.remainingInPhaseSec, 14); // 26 - 12 = 14s

  // 3. Golden Evacuation Window (at 40 seconds)
  const golden = resolveActiveDisasterPhase(strategy, 40000);
  assert.equal(golden.phaseId, "EARTHQUAKE_GOLDEN_WINDOW");
  assert.equal(golden.phaseIndex, 3);
  assert.equal(golden.isSevereShaking, false);
  assert.equal(golden.requiresCover, false);
  assert.match(golden.instructionText, /WAKTU EMAS EVAKUASI|Lapangan Upacara/i);
  assert.equal(golden.remainingInPhaseSec, 46); // 86 - 40 = 46s

  // 4. Aftershocks & Collapses (at 120 seconds)
  const aftershocks = resolveActiveDisasterPhase(strategy, 120000);
  assert.equal(aftershocks.phaseId, "EARTHQUAKE_AFTERSHOCKS");
  assert.equal(aftershocks.phaseIndex, 4);
  assert.equal(aftershocks.remainingInPhaseSec, 0); // ongoing final phase
});

test("Tsunami disaster lifecycle enforces Early Warning with ETA countdown and Floor 1 Wave Inundation", () => {
  const strategy = resolveDisasterStrategy("Tsunami", "Gelombang Tsunami & Banjir");
  assert.equal(strategy.key, "TSUNAMI_FLOOD");
  assert.ok(strategy.goalTypes.includes("HIGH_GROUND"));

  // 1. Early Warning at t = 10s: Wave ETA is 45s
  const warning1 = resolveActiveDisasterPhase(strategy, 10000);
  assert.equal(warning1.phaseId, "TSUNAMI_EARLY_WARNING");
  assert.equal(warning1.waveEtaSec, 45);
  assert.equal(warning1.isTsunamiWaveArrival, false);
  assert.equal(warning1.inundatesGroundFloor, false);
  assert.match(warning1.instructionText, /EVAKUASI VERTIKAL|Lantai 2/i);

  // 2. Early Warning at t = 50s: Wave ETA is 5s
  const warning2 = resolveActiveDisasterPhase(strategy, 50000);
  assert.equal(warning2.waveEtaSec, 5);
  assert.equal(warning2.isTsunamiWaveArrival, false);

  // 3. Wave Arrival at t = 60s (ETA has reached 0): Wave inundates Ground Floor
  const arrival = resolveActiveDisasterPhase(strategy, 60000);
  assert.equal(arrival.phaseId, "TSUNAMI_WAVE_INUNDATION");
  assert.equal(arrival.waveEtaSec, 0);
  assert.equal(arrival.isTsunamiWaveArrival, true);
  assert.equal(arrival.inundatesGroundFloor, true);
  assert.match(arrival.warningText, /GELOMBANG TSUNAMI MENERJANG/i);
});

test("SMAN 1 Ngoro Digital Twin supports vertical evacuation to Floor 2 High Ground Shelter", () => {
  const twin = buildSman1NgoroPdfDigitalTwin();
  const tsunamiScen = twin.scenarios.find((s) => s.id === "scenario-sman1-tsunami");
  assert.ok(tsunamiScen, "Tsunami scenario must be defined");

  // Spawn must be on ground floor (Lantai 1)
  const spawn = tsunamiScen.objects.find((o) => o.object_type === "SPAWN");
  assert.ok(spawn, "Spawn point must exist");
  assert.equal(spawn.floor_id, "floor-sman1-1", "Tsunami spawn must be on ground floor");

  // High Ground destination must be on upper floor (Lantai 2)
  const highGround = tsunamiScen.objects.find((o) => o.object_type === "HIGH_GROUND");
  assert.ok(highGround, "HIGH_GROUND objective must exist");
  assert.equal(highGround.floor_id, "floor-sman1-2", "HIGH_GROUND target must be located on Lantai 2");

  // Stairs must connect Floor 1 and Floor 2
  const stairs = twin.stairs.filter((st) => st.from_floor_id === "floor-sman1-1" || st.from_floor_id === "floor-sman1-2");
  assert.ok(stairs.length > 0, "Stairs connecting Lantai 1 and Lantai 2 must exist");
});
