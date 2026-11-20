import { PRNG } from './prng.js';
import { round3, distanceXZ, transformMove } from './math.js';
import { DEFAULT_TUNING } from './constants.js';

export class GameEngine {
  constructor(options = {}) {
    this.tuning = { ...DEFAULT_TUNING, ...(options.tuning || {}) };
    this.tuning.score = { ...DEFAULT_TUNING.score, ...(options.tuning?.score || {}) };
    
    this.seed = options.seed ?? 42;
    this.prng = new PRNG(this.seed);

    this.tick = 0;
    this.sim_tick = 0;
    this.state = 'playing'; // 'playing' | 'won' | 'lost'
    this.score = 0;
    this.time_left_s = this.tuning.night1_duration_s;

    // Player
    this.player = {
      pos: [0.0, 0.0, 0.0],
      flames: this.tuning.flames,
      carried: 0,
      invuln_ticks: 0,
      pulse_cooldown_ticks: 0,
      prev_interact: false,
      prev_pulse: false
    };

    // Lanterns
    this.lanterns = this.initLanterns();

    // Motes
    this.motes = [];

    // Shades
    this.shades = [];

    // Event queue for the current tick
    this.events = [];

    // Apply scenario if provided
    if (options.scenario) {
      this.applyScenario(options.scenario);
    } else {
      this.initDefaultEntities();
    }
  }

  initLanterns() {
    const r = 25.0;
    const angles = [0, 72, 144, 216, 288];
    return angles.map((deg, idx) => {
      const rad = (deg * Math.PI) / 180;
      const x = round3(r * Math.sin(rad));
      const z = round3(r * Math.cos(rad));
      return {
        id: `L${idx + 1}`,
        pos: [x, 0.0, z],
        lit: false,
        deposited: 0
      };
    });
  }

  initDefaultEntities() {
    // Generate 20 motes deterministically
    for (let i = 0; i < 20; i++) {
      const r = this.prng.range(5, 30);
      const theta = this.prng.range(0, Math.PI * 2);
      const x = round3(r * Math.cos(theta));
      const z = round3(r * Math.sin(theta));
      this.motes.push({
        id: `M${i + 1}`,
        pos: [x, 0.0, z]
      });
    }

    // Generate 3 shades
    for (let i = 0; i < 3; i++) {
      const r = this.prng.range(22, 32);
      const theta = (i * 2 * Math.PI) / 3;
      const x = round3(r * Math.cos(theta));
      const z = round3(r * Math.sin(theta));
      const id = `S${i + 1}`;
      this.shades.push({
        id,
        pos: [x, 0.0, z],
        state: 'chase',
        stun_ticks: 0
      });
    }
  }

  applyScenario(scenario) {
    if (scenario.time_left_s !== undefined) {
      this.time_left_s = scenario.time_left_s;
    }

    if (scenario.player) {
      if (scenario.player.pos) this.player.pos = [...scenario.player.pos];
      if (scenario.player.carried !== undefined) this.player.carried = scenario.player.carried;
      if (scenario.player.flames !== undefined) this.player.flames = scenario.player.flames;
    }

    if (scenario.lanterns) {
      for (const scLantern of scenario.lanterns) {
        let existing = this.lanterns.find((l) => l.id === scLantern.id);
        if (!existing) {
          existing = { id: scLantern.id, pos: [0, 0, 0], lit: false, deposited: 0 };
          this.lanterns.push(existing);
        }
        if (scLantern.pos) existing.pos = [...scLantern.pos];
        if (scLantern.deposited !== undefined) existing.deposited = scLantern.deposited;
        if (scLantern.lit !== undefined) existing.lit = scLantern.lit;
      }
    }

    if (scenario.motes !== undefined) {
      this.motes = scenario.motes.map((m, idx) => {
        if (Array.isArray(m)) {
          return { id: `M${idx + 1}`, pos: [...m] };
        }
        return { id: m.id || `M${idx + 1}`, pos: [...m.pos] };
      });
    } else if (scenario.random_motes !== false) {
      for (let i = 0; i < 20; i++) {
        const r = this.prng.range(5, 30);
        const theta = this.prng.range(0, Math.PI * 2);
        this.motes.push({
          id: `M${i + 1}`,
          pos: [round3(r * Math.cos(theta)), 0.0, round3(r * Math.sin(theta))]
        });
      }
    }

    if (scenario.shades !== undefined) {
      this.shades = scenario.shades.map((s, idx) => ({
        id: s.id || `S${idx + 1}`,
        pos: [...s.pos],
        state: s.state || 'chase',
        stun_ticks: 0
      }));
    } else if (scenario.random_shades !== false) {
      for (let i = 0; i < 3; i++) {
        const r = this.prng.range(22, 32);
        const theta = (i * 2 * Math.PI) / 3;
        this.shades.push({
          id: `S${i + 1}`,
          pos: [round3(r * Math.cos(theta)), 0.0, round3(r * Math.sin(theta))],
          state: 'chase',
          stun_ticks: 0
        });
      }
    }
  }

  step(input = {}) {
    if (this.state !== 'playing') {
      return [];
    }

    this.tick += 1;
    this.sim_tick += 1;
    this.events = [];

    // Decrement timers
    this.time_left_s = Math.max(0, this.time_left_s - 1 / 60);
    if (this.player.invuln_ticks > 0) this.player.invuln_ticks -= 1;
    if (this.player.pulse_cooldown_ticks > 0) this.player.pulse_cooldown_ticks -= 1;

    // 1. Movement
    const move = input.move || [0, 0];
    const camYaw = input.cam_yaw_deg || 0;
    const [dx, dz] = transformMove(move, camYaw);
    const speed = this.tuning.player_speed / 60; // meters per tick
    this.player.pos[0] = round3(this.player.pos[0] + dx * speed);
    this.player.pos[2] = round3(this.player.pos[2] + dz * speed);

    // 2. Pulse (Rising edge: false -> true)
    const isPulse = Boolean(input.pulse);
    const pulseTriggered = isPulse && !this.player.prev_pulse;
    this.player.prev_pulse = isPulse;

    if (pulseTriggered && this.player.pulse_cooldown_ticks === 0) {
      // Check if pulse cost is satisfied (motes or free if pulse_cost == 0)
      if (this.player.carried >= this.tuning.pulse_cost) {
        this.player.carried -= this.tuning.pulse_cost;
        this.player.pulse_cooldown_ticks = Math.round(this.tuning.pulse_cooldown_s * 60);

        const stunned_ids = [];
        const stunTicks = Math.round(this.tuning.pulse_stun_s * 60);

        for (const shade of this.shades) {
          const dist = distanceXZ(this.player.pos, shade.pos);
          if (dist <= this.tuning.pulse_radius) {
            stunned_ids.push(shade.id);
            shade.state = 'stunned';
            shade.stun_ticks = stunTicks;

            // Push back away from player
            const angle = Math.atan2(shade.pos[2] - this.player.pos[2], shade.pos[0] - this.player.pos[0]);
            shade.pos[0] = round3(shade.pos[0] + Math.cos(angle) * this.tuning.pulse_push_m);
            shade.pos[2] = round3(shade.pos[2] + Math.sin(angle) * this.tuning.pulse_push_m);

            this.score += this.tuning.score.per_stun;
          }
        }

        this.events.push({
          type: 'event',
          tick: this.tick,
          name: 'pulse',
          data: { stunned_ids }
        });
      }
    }

    // 3. Pickup motes
    const remainingMotes = [];
    for (const mote of this.motes) {
      const dist = distanceXZ(this.player.pos, mote.pos);
      if (dist <= this.tuning.pickup_radius && this.player.carried < this.tuning.carry_capacity) {
        this.player.carried += 1;
        this.score += this.tuning.score.per_mote;
        this.events.push({
          type: 'event',
          tick: this.tick,
          name: 'mote_picked',
          data: { carried: this.player.carried }
        });
      } else {
        remainingMotes.push(mote);
      }
    }
    this.motes = remainingMotes;

    // 4. Deposit into Lantern (Rising edge: false -> true)
    const isInteract = Boolean(input.interact);
    const interactTriggered = isInteract && !this.player.prev_interact;
    this.player.prev_interact = isInteract;

    if (interactTriggered && this.player.carried > 0) {
      for (const lantern of this.lanterns) {
        if (!lantern.lit) {
          const dist = distanceXZ(this.player.pos, lantern.pos);
          if (dist <= this.tuning.interact_radius) {
            const needed = this.tuning.lantern_cost - lantern.deposited;
            const depositAmount = Math.min(this.player.carried, needed);

            if (depositAmount > 0) {
              this.player.carried -= depositAmount;
              lantern.deposited += depositAmount;

              this.events.push({
                type: 'event',
                tick: this.tick,
                name: 'deposit',
                data: {
                  lantern_id: lantern.id,
                  amount: depositAmount,
                  deposited: lantern.deposited
                }
              });

              if (lantern.deposited >= this.tuning.lantern_cost) {
                lantern.lit = true;
                this.score += this.tuning.score.per_lantern;
                this.events.push({
                  type: 'event',
                  tick: this.tick,
                  name: 'lantern_lit',
                  data: { lantern_id: lantern.id }
                });
              }
            }
            break; // Interact with one lantern at a time
          }
        }
      }
    }

    // 5. Update Shades (Chase player, avoid lit lantern safe zone)
    const shadeSpeed = this.tuning.shade_speed / 60;
    for (const shade of this.shades) {
      if (shade.stun_ticks > 0) {
        shade.stun_ticks -= 1;
        if (shade.stun_ticks <= 0) {
          shade.state = 'chase';
        }
        continue;
      }

      // Check if player is inside any safe zone
      let inSafeZone = false;
      for (const lantern of this.lanterns) {
        if (lantern.lit && distanceXZ(this.player.pos, lantern.pos) <= this.tuning.safe_radius) {
          inSafeZone = true;
          break;
        }
      }

      // If player is in safe zone, shade avoids entering safe zone
      const distToPlayer = distanceXZ(shade.pos, this.player.pos);
      if (distToPlayer > 0.05 && !inSafeZone) {
        const dx = (this.player.pos[0] - shade.pos[0]) / distToPlayer;
        const dz = (this.player.pos[2] - shade.pos[2]) / distToPlayer;
        shade.pos[0] = round3(shade.pos[0] + dx * shadeSpeed);
        shade.pos[2] = round3(shade.pos[2] + dz * shadeSpeed);
      }

      // Check collision with player
      if (this.player.invuln_ticks === 0 && distToPlayer <= this.tuning.shade_hit_radius) {
        this.player.flames -= 1;
        this.player.invuln_ticks = Math.round(this.tuning.invuln_s * 60);

        const dropped = Math.floor(this.player.carried * this.tuning.hit_drop_ratio);
        this.player.carried -= dropped;

        // Scatter dropped motes near player
        for (let d = 0; d < dropped; d++) {
          const dropAngle = (d * 2 * Math.PI) / (dropped || 1);
          this.motes.push({
            id: `M_drop_${this.tick}_${d}`,
            pos: [
              round3(this.player.pos[0] + Math.cos(dropAngle) * 1.5),
              0.0,
              round3(this.player.pos[2] + Math.sin(dropAngle) * 1.5)
            ]
          });
        }

        this.events.push({
          type: 'event',
          tick: this.tick,
          name: 'player_hit',
          data: {
            by: 'shade',
            flames: this.player.flames,
            dropped
          }
        });

        if (this.player.flames <= 0) {
          this.state = 'lost';
          this.events.push({
            type: 'event',
            tick: this.tick,
            name: 'game_over',
            data: { result: 'lost', reason: 'no_flames' }
          });
          return this.events;
        }
      }
    }

    // 6. Check Win Condition (All lanterns lit)
    const allLit = this.lanterns.length > 0 && this.lanterns.every((l) => l.lit);
    if (allLit) {
      this.state = 'won';
      // Calculate bonus score
      this.score += Math.round(this.time_left_s) * this.tuning.score.per_second_left;
      this.score += this.player.flames * this.tuning.score.per_flame_left;

      this.events.push({
        type: 'event',
        tick: this.tick,
        name: 'game_over',
        data: { result: 'won', reason: 'all_lit' }
      });
      return this.events;
    }

    // 7. Check Lose Condition (Time expired)
    if (this.time_left_s <= 0) {
      this.state = 'lost';
      this.events.push({
        type: 'event',
        tick: this.tick,
        name: 'game_over',
        data: { result: 'lost', reason: 'dawn' }
      });
      return this.events;
    }

    return this.events;
  }

  getSnapshot() {
    return {
      type: 'snapshot',
      tick: this.tick,
      sim_tick: this.sim_tick,
      state: this.state,
      time_left_s: round3(this.time_left_s),
      score: this.score,
      player: {
        pos: [round3(this.player.pos[0]), round3(this.player.pos[1]), round3(this.player.pos[2])],
        flames: this.player.flames,
        carried: this.player.carried
      },
      lanterns: this.lanterns.map((l) => ({
        id: l.id,
        pos: [round3(l.pos[0]), round3(l.pos[1]), round3(l.pos[2])],
        lit: l.lit,
        deposited: l.deposited
      })),
      shades: this.shades.map((s) => ({
        id: s.id,
        pos: [round3(s.pos[0]), round3(s.pos[1]), round3(s.pos[2])],
        state: s.state
      })),
      motes_active: this.motes.length
    };
  }

  getEnd() {
    return {
      type: 'end',
      ticks: this.tick,
      state: this.state,
      score: this.score
    };
  }
}
