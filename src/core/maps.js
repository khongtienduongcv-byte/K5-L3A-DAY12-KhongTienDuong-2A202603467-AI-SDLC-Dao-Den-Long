import { round3 } from './math.js';

export function getMapData(night = 1) {
  if (night === 2) {
    return {
      night: 2,
      duration_s: 330,
      start_pos: [0, 0, 0],
      lanterns: [
        { id: 'L1', pos: [0, 0, 20] },
        { id: 'L2', pos: [17, 0, -10] },
        { id: 'L3', pos: [-17, 0, -10] },
        { id: 'L4', pos: [70, 0, 20] },
        { id: 'L5', pos: [87, 0, -10] },
        { id: 'L6', pos: [53, 0, -10] }
      ],
      charms: [{ id: 'C1', pos: [35, 0, 0] }],
      jump_pads: [
        { pos: [20, 0, 18], target: [70, 0, 0], vy: 14, vh: 24 },
        { pos: [50, 0, -18], target: [0, 0, 0], vy: 14, vh: 24 }
      ],
      shade_spawn_interval_ticks: 420, // 7s
      max_shades: 8
    };
  }

  if (night === 3) {
    return {
      night: 3,
      duration_s: 360,
      start_pos: [0, 0, 0],
      lanterns: [
        { id: 'L1', pos: [0, 6, 6] },
        { id: 'L2', pos: [18, 3, 10] },
        { id: 'L3', pos: [-18, 3, 10] },
        { id: 'L4', pos: [35, 0, -10] },
        { id: 'L5', pos: [-35, 0, -10] },
        { id: 'L6', pos: [20, 0, -35] },
        { id: 'L7', pos: [-20, 0, -35] }
      ],
      charms: [
        { id: 'C1', pos: [30, 0, 25] },
        { id: 'C2', pos: [-30, 0, 25] }
      ],
      jump_pads: [{ pos: [0, 3, 13], target: [0, 6, 0], vy: 12, vh: 8 }],
      shade_spawn_interval_ticks: 360, // 6s
      max_shades: 10
    };
  }

  // Night 1 Default
  return {
    night: 1,
    duration_s: 300,
    start_pos: [0, 0, 0],
    lanterns: [
      { id: 'L1', pos: [0, 0, 25] },
      { id: 'L2', pos: [23.8, 0, 7.7] },
      { id: 'L3', pos: [14.7, 0, -20.2] },
      { id: 'L4', pos: [-14.7, 0, -20.2] },
      { id: 'L5', pos: [-23.8, 0, 7.7] }
    ],
    charms: [],
    jump_pads: [],
    shade_spawn_interval_ticks: 480, // 8s
    max_shades: 6
  };
}

/**
 * Returns ground height Y at position (x, z), or null if off island
 */
export function getGroundHeight(x, z, night = 1) {
  if (night === 1) {
    const distSq = x * x + z * z;
    if (distSq <= 40 * 40) return 0.0;
    return null; // fell off island
  }

  if (night === 2) {
    const distA = Math.sqrt(x * x + z * z);
    if (distA <= 28) return 0.0;
    const distB = Math.sqrt((x - 70) * (x - 70) + z * z);
    if (distB <= 28) return 0.0;
    if (x >= 26 && x <= 44 && Math.abs(z) <= 2) return 0.0; // bridge
    return null;
  }

  if (night === 3) {
    const dist = Math.sqrt(x * x + z * z);
    if (dist > 45) return null; // off island

    // Bell tower obstruction (r <= 2 at center of tier 2)
    // Tier 2: radius <= 8, Y = 6
    if (dist <= 8) return 6.0;

    // Tier 1: 12 <= r <= 24 and z > 0, Y = 3
    if (dist >= 12 && dist <= 24 && z > 0) return 3.0;

    // Ramps from r=30 (Y=0) to r=24 (Y=3) at 30 deg and 150 deg (width 3m)
    // For simplicity of ground calculation:
    return 0.0;
  }

  return 0.0;
}
