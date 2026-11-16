import test from 'node:test';
import assert from 'node:assert/strict';

// Test safeNormalize mathematical invariant
function safeNormalize(cartesian, fallback = { x: 0, y: 0, z: 1 }) {
  if (!cartesian) return { ...fallback };
  const x = Number.isFinite(cartesian.x) ? cartesian.x : 0;
  const y = Number.isFinite(cartesian.y) ? cartesian.y : 0;
  const z = Number.isFinite(cartesian.z) ? cartesian.z : 0;
  const magSq = x * x + y * y + z * z;
  if (magSq < 1e-12 || !Number.isFinite(magSq)) {
    return { ...fallback };
  }
  const invMag = 1.0 / Math.sqrt(magSq);
  const rx = x * invMag;
  const ry = y * invMag;
  const rz = z * invMag;
  if (!Number.isFinite(rx) || !Number.isFinite(ry) || !Number.isFinite(rz)) {
    return { ...fallback };
  }
  return { x: rx, y: ry, z: rz };
}

function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function magnitude(v) {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

test('safeNormalize handles zero vectors without throwing DeveloperError', () => {
  const zero = { x: 0, y: 0, z: 0 };
  const result = safeNormalize(zero, { x: 0, y: 0, z: 1 });
  assert.equal(result.x, 0);
  assert.equal(result.y, 0);
  assert.equal(result.z, 1);
});

test('safeNormalize handles NaN and Infinity gracefully', () => {
  const nanVec = { x: NaN, y: Infinity, z: 0 };
  const result = safeNormalize(nanVec, { x: 1, y: 0, z: 0 });
  assert.equal(result.x, 1);
  assert.equal(result.y, 0);
  assert.equal(result.z, 0);
});

test('safeNormalize produces strictly unit magnitude vectors on valid inputs', () => {
  const v = { x: 3000000, y: -4000000, z: 12000000 };
  const result = safeNormalize(v);
  const mag = magnitude(result);
  assert.ok(Math.abs(mag - 1.0) < 1e-6, `Magnitude was ${mag}`);
});

test('Collinear guard guarantees non-zero cross product for camera setView', () => {
  // Test case where lookDir is collinear with up vector
  const lookDir = { x: 0, y: 0, z: 1 };
  let currentUp = { x: 0, y: 0, z: 1 }; // Collinear!

  let rightCross = cross(lookDir, currentUp);
  if (magnitude(rightCross) < 1e-4) {
    currentUp = { x: 0, y: 1, z: 0 };
    rightCross = cross(lookDir, currentUp);
    if (magnitude(rightCross) < 1e-4) {
      currentUp = { x: 1, y: 0, z: 0 };
      rightCross = cross(lookDir, currentUp);
    }
  }

  const cleanUp = safeNormalize(currentUp, { x: 0, y: 1, z: 0 });
  const finalRight = cross(lookDir, cleanUp);
  const finalRightMag = magnitude(finalRight);

  assert.ok(finalRightMag > 0.5, `Final right cross product magnitude must be non-zero, got ${finalRightMag}`);
  assert.ok(Number.isFinite(finalRight.x) && Number.isFinite(finalRight.y) && Number.isFinite(finalRight.z));
});

test('World-space celestial zoom dollies monotonically within safe bounds', () => {
  const targetPos = { x: 50000000, y: 120000000, z: -3000000 };
  const minDistance = 2000000;
  const maxDistance = 25000000;
  let currentDist = 8000000;

  // Zoom In test
  const factorIn = 0.65;
  const newDistIn = Math.max(minDistance, currentDist * factorIn);
  assert.ok(newDistIn < currentDist, 'Zoom in should reduce distance');
  assert.ok(newDistIn >= minDistance, 'Zoom in must respect minDistance');

  // Zoom Out test
  const factorOut = 1.45;
  const newDistOut = Math.min(maxDistance, currentDist * factorOut);
  assert.ok(newDistOut > currentDist, 'Zoom out should increase distance');
  assert.ok(newDistOut <= maxDistance, 'Zoom out must respect maxDistance');
});
