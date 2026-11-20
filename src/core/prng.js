/**
 * Deterministic Pseudo-Random Number Generator using Mulberry32 algorithm.
 */
export class PRNG {
  constructor(seed = 1) {
    this.seed = (seed >>> 0) || 1;
    this.s = this.seed;
  }

  reset(seed = null) {
    if (seed !== null) {
      this.seed = (seed >>> 0) || 1;
    }
    this.s = this.seed;
  }

  /**
   * Returns a float in [0, 1)
   */
  next() {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a float in [min, max)
   */
  range(min, max) {
    return min + this.next() * (max - min);
  }

  /**
   * Returns an integer in [min, max]
   */
  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }
}
