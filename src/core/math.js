/**
 * Math utilities for 2D/3D coordinate transformations and XZ physics calculations.
 */

export function round3(val) {
  return Math.round(val * 1000) / 1000;
}

export function distanceXZ(posA, posB) {
  const dx = posA[0] - posB[0];
  const dz = posA[2] - posB[2];
  return Math.sqrt(dx * dx + dz * dz);
}

export function normalize2D(x, z) {
  const len = Math.sqrt(x * x + z * z);
  if (len > 1.0) {
    return [x / len, z / len];
  }
  return [x, z];
}

/**
 * Transforms [move_x, move_z] according to camera yaw in degrees:
 * theta = cam_yaw_deg in radians
 * x' = x * cos(theta) + z * sin(theta)
 * z' = -x * sin(theta) + z * cos(theta)
 * Normalizes vector if length > 1
 */
export function transformMove(move, camYawDeg = 0) {
  const [x, z] = move;
  const theta = (camYawDeg * Math.PI) / 180;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);

  const worldX = x * cosT + z * sinT;
  const worldZ = -x * sinT + z * cosT;

  return normalize2D(worldX, worldZ);
}
