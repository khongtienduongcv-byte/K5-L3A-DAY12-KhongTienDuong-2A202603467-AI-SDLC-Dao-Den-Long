import { PRNG } from './prng.js';
import { round3, distanceXZ, transformMove } from './math.js';
import { DEFAULT_TUNING } from './constants.js';
import { getMapData, getGroundHeight } from './maps.js';

export function round1(val) {
  return Math.round(val * 10) / 10;
}

export class GameEngine {
  constructor(options = {}) {
    this.tuning = { ...DEFAULT_TUNING, ...(options.tuning || {}) };
    this.tuning.score = { ...DEFAULT_TUNING.score, ...(options.tuning?.score || {}) };

    this.night = options.night || 1;
    this.mapData = getMapData(this.night);

    this.seed = options.seed ?? 42;
    this.prng = new PRNG(this.seed);

    this.tick = 0;
    this.sim_tick = 0;
    this.state = 'playing'; // 'playing' | 'paused' | 'won' | 'lost'
    this.is_paused = false;
    this.score = 0;
    this.time_left_s = this.mapData.duration_s;

    // Wind system (Night 3)
    this.wind = {
      active: false,
      dir_deg: 0,
      timer_ticks: 0,
      duration_ticks: 0
    };
    this.wind_enabled = options.wind_enabled !== false;

    // Player
    this.successful_lights = 0;
    this.player = {
      pos: [...this.mapData.start_pos],
      vel: [0.0, 0.0, 0.0],
      facing: [0, 1], // +Z facing
      flames: this.tuning.flames,
      carried: 0,
      grounded: true,
      invuln_ticks: 0,
      dash_ticks_left: 0,
      dash_cd_ticks: 0,
      dash_dir: [0, 1],
      pulse_cd_ticks: 0,
      charm_ticks: 0,
      respawn_wait_ticks: 0,
      prev_interact: false,
      prev_pulse: false,
      prev_dash: false,
      prev_jump: false,
      prev_pause: false
    };

    // Lanterns
    this.lanterns = this.mapData.lanterns.map((l) => ({
      id: l.id,
      pos: [...l.pos],
      lit: false,
      fuel: 0.0,
      deposited: 0,
      ever_lit: false,
      relit_count: 0,
      just_lit_ticks: 0
    }));

    // Motes
    this.motes = [];

    // Shades
    this.shades = [];
    this.shade_spawn_counter = 0;
    this.total_shades_spawned = 0;

    // Drifters (Gió Lạc - Night 2 & 3)
    this.drifters = [];
    this.drifter_spawn_counter = 0;
    this.total_drifters_spawned = 0;
    this.random_drifters = options.random_drifters !== false;

    // Charms (Bùa Gió)
    this.charms = (this.mapData.charms || []).map((c) => ({
      id: c.id,
      pos: [...c.pos],
      available: true,
      respawn_ticks: 0
    }));

    // Jump pads
    this.jump_pads = this.mapData.jump_pads || [];

    // Events emitted in current tick
    this.events = [];

    // Apply scenario or init default
    if (options.scenario) {
      this.applyScenario(options.scenario);
    } else {
      this.initDefaultEntities();
    }
  }

  get capacity() {
    return Math.min(this.tuning.capacity_max, 10 + 2 * this.successful_lights);
  }

  initDefaultEntities() {
    const spawnPoints = [];
    if (this.night === 1) {
      for (let i = 0; i < 8; i++) {
        const rad = (i * 45 * Math.PI) / 180;
        spawnPoints.push([round3(12 * Math.cos(rad)), 0.0, round3(12 * Math.sin(rad))]);
      }
      for (let i = 0; i < 16; i++) {
        const rad = (i * 22.5 * Math.PI) / 180;
        spawnPoints.push([round3(33 * Math.cos(rad)), 0.0, round3(33 * Math.sin(rad))]);
      }
    } else if (this.night === 2) {
      for (const cx of [0, 70]) {
        for (let i = 0; i < 4; i++) {
          const rad = (i * 90 * Math.PI) / 180;
          spawnPoints.push([round3(cx + 10 * Math.cos(rad)), 0.0, round3(10 * Math.sin(rad))]);
        }
        for (let i = 0; i < 8; i++) {
          const rad = (i * 45 * Math.PI) / 180;
          spawnPoints.push([round3(cx + 22 * Math.cos(rad)), 0.0, round3(22 * Math.sin(rad))]);
        }
      }
    } else {
      for (let i = 0; i < 18; i++) {
        const rad = (i * 20 * Math.PI) / 180;
        spawnPoints.push([round3(34 * Math.cos(rad)), 0.0, round3(34 * Math.sin(rad))]);
      }
      for (let i = 0; i < 8; i++) {
        const rad = ((20 + i * 20) * Math.PI) / 180;
        spawnPoints.push([round3(18 * Math.cos(rad)), 3.0, round3(18 * Math.sin(rad))]);
      }
      for (let i = 0; i < 4; i++) {
        const rad = ((45 + i * 90) * Math.PI) / 180;
        spawnPoints.push([round3(5 * Math.cos(rad)), 6.0, round3(5 * Math.sin(rad))]);
      }
    }

    for (let i = 0; i < Math.min(20, spawnPoints.length); i++) {
      this.motes.push({
        id: `M${i + 1}`,
        pos: [...spawnPoints[i]],
        kind: 'random',
        ttl_ticks: null
      });
    }
  }

  applyScenario(scenario) {
    if (scenario.time_left_s !== undefined) {
      this.time_left_s = scenario.time_left_s;
    }
    if (scenario.night !== undefined) {
      this.night = scenario.night;
      this.mapData = getMapData(this.night);
    }
    if (scenario.wind_enabled !== undefined) {
      this.wind_enabled = scenario.wind_enabled;
    }

    if (scenario.player) {
      if (scenario.player.pos) this.player.pos = [...scenario.player.pos];
      if (scenario.player.vel) this.player.vel = [...scenario.player.vel];
      if (scenario.player.carried !== undefined) this.player.carried = scenario.player.carried;
      if (scenario.player.flames !== undefined) this.player.flames = scenario.player.flames;
      if (scenario.player.invuln_ticks !== undefined) this.player.invuln_ticks = scenario.player.invuln_ticks;
      if (scenario.player.dash_cd_ticks !== undefined) this.player.dash_cd_ticks = scenario.player.dash_cd_ticks;
      if (scenario.player.pulse_cd_ticks !== undefined) this.player.pulse_cd_ticks = scenario.player.pulse_cd_ticks;
      if (scenario.player.charm_ticks !== undefined) this.player.charm_ticks = scenario.player.charm_ticks;
      if (scenario.player.successful_lights !== undefined) this.successful_lights = scenario.player.successful_lights;
    }

    if (scenario.lanterns) {
      for (const scL of scenario.lanterns) {
        let existing = this.lanterns.find((l) => l.id === scL.id);
        if (!existing) {
          existing = { id: scL.id, pos: [0, 0, 0], lit: false, fuel: 0, deposited: 0, ever_lit: false, relit_count: 0, just_lit_ticks: 0 };
          this.lanterns.push(existing);
        }
        if (scL.pos) existing.pos = [...scL.pos];
        if (scL.deposited !== undefined) existing.deposited = scL.deposited;
        if (scL.lit !== undefined) existing.lit = scL.lit;
        if (scL.ever_lit !== undefined) existing.ever_lit = scL.ever_lit;
        if (scL.relit_count !== undefined) existing.relit_count = scL.relit_count;

        // Default fuel for scenario lit lanterns
        if (scL.fuel !== undefined) {
          existing.fuel = scL.fuel;
        } else if (existing.lit) {
          existing.fuel = 100.0;
        }
      }
    }

    if (scenario.motes !== undefined) {
      this.motes = scenario.motes.map((m, idx) => {
        if (Array.isArray(m)) {
          return { id: `M${idx + 1}`, pos: [...m], kind: 'random', ttl_ticks: null };
        }
        return {
          id: m.id || `M${idx + 1}`,
          pos: [...m.pos],
          kind: m.kind || 'random',
          ttl_ticks: m.ttl_s !== undefined ? Math.round(m.ttl_s * 60) : null
        };
      });
    } else if (scenario.random_motes !== false) {
      this.initDefaultEntities();
    }

    if (scenario.shades !== undefined) {
      this.shades = scenario.shades.map((s, idx) => ({
        id: s.id || `S${idx + 1}`,
        pos: [...s.pos],
        state: s.state || 'wander',
        state_ticks_left: s.state_ticks_left || 0,
        drain_ticks: 0,
        target_lantern_id: s.target_lantern_id || null,
        recoil_dir: [0, 0]
      }));
      this.total_shades_spawned = this.shades.length;
    }

    if (scenario.drifters !== undefined) {
      this.drifters = scenario.drifters.map((d, idx) => ({
        id: d.id || `D${idx + 1}`,
        pos: [...d.pos],
        state: d.state || 'idle',
        stolen: d.stolen || 0,
        flee_ticks_left: d.flee_ticks_left || 0
      }));
      this.total_drifters_spawned = this.drifters.length;
    }

    if (scenario.charms !== undefined) {
      this.charms = scenario.charms.map((c, idx) => ({
        id: c.id || `C${idx + 1}`,
        pos: c.pos ? [...c.pos] : [0, 0, 0],
        available: c.available !== false,
        respawn_ticks: c.respawn_s !== undefined ? Math.round(c.respawn_s * 60) : 0
      }));
    }
  }

  step(input = {}) {
    this.tick += 1;
    this.events = [];

    // STEP 1: Process pause input first
    const isPause = Boolean(input.pause);
    const pauseTriggered = isPause && !this.player.prev_pause;
    this.player.prev_pause = isPause;

    if (pauseTriggered) {
      this.is_paused = !this.is_paused;
      this.state = this.is_paused ? 'paused' : 'playing';
      this.events.push({
        type: 'event',
        tick: this.tick,
        name: this.is_paused ? 'paused' : 'resumed',
        data: {}
      });
      return this.events;
    }

    if (this.is_paused || this.state === 'won' || this.state === 'lost') {
      return [];
    }

    this.sim_tick += 1;

    // STEP 2: Decrement counters & Fuel decay / drain
    this.time_left_s = Math.max(0, this.time_left_s - 1 / 60);
    if (this.player.invuln_ticks > 0) this.player.invuln_ticks -= 1;
    if (this.player.dash_cd_ticks > 0) this.player.dash_cd_ticks -= 1;
    if (this.player.pulse_cd_ticks > 0) this.player.pulse_cd_ticks -= 1;
    if (this.player.charm_ticks > 0) this.player.charm_ticks -= 1;

    // Decrement mote TTLs
    this.motes = this.motes.filter((m) => {
      if (m.ttl_ticks !== null) {
        m.ttl_ticks -= 1;
        return m.ttl_ticks > 0;
      }
      return true;
    });

    // Decrement charm respawn
    for (const c of this.charms) {
      if (!c.available && c.respawn_ticks > 0) {
        c.respawn_ticks -= 1;
        if (c.respawn_ticks <= 0) {
          c.available = true;
        }
      }
    }

    // Decrement lantern just_lit push timers
    for (const l of this.lanterns) {
      if (l.just_lit_ticks > 0) l.just_lit_ticks -= 1;
    }

    // Fuel decay (1.0/s = 1/60 per tick) + Shades drain (5/s = 5/60 per tick)
    for (const l of this.lanterns) {
      if (l.lit) {
        l.fuel = Math.max(0, l.fuel - 1.0 / 60);

        // Count draining shades
        const drainers = this.shades.filter((s) => s.state === 'drain' && s.target_lantern_id === l.id);
        for (const s of drainers) {
          l.fuel = Math.max(0, l.fuel - 5.0 / 60);
          s.drain_ticks = (s.drain_ticks || 0) + 1;
          if (s.drain_ticks % 60 === 0) {
            this.events.push({
              type: 'event',
              tick: this.tick,
              name: 'fuel_drain',
              data: {
                lantern_id: l.id,
                shade_id: s.id,
                fuel: round1(l.fuel)
              }
            });
          }
        }

        // Lantern out
        if (l.fuel <= 0) {
          l.lit = false;
          l.fuel = 0.0;
          l.deposited = 0;
          l.ever_lit = true;
          this.events.push({
            type: 'event',
            tick: this.tick,
            name: 'lantern_out',
            data: { lantern_id: l.id }
          });
        }
      }
    }

    // Wind updates (Night 3)
    if (this.night === 3 && this.wind_enabled) {
      this.wind.timer_ticks += 1;
      if (!this.wind.active && this.wind.timer_ticks >= 1800) { // every 30s
        this.wind.active = true;
        this.wind.duration_ticks = 300; // 5s
        this.wind.dir_deg = round3(this.prng.range(0, 360));
        this.wind.timer_ticks = 0;
      } else if (this.wind.active) {
        this.wind.duration_ticks -= 1;
        if (this.wind.duration_ticks <= 0) {
          this.wind.active = false;
        }
      }
    }

    // Handle fall respawn waiting
    if (this.player.respawn_wait_ticks > 0) {
      this.player.respawn_wait_ticks -= 1;
      if (this.player.respawn_wait_ticks === 0) {
        this.player.pos = [...this.mapData.start_pos];
        this.player.vel = [0, 0, 0];
        this.player.grounded = true;
        this.player.invuln_ticks = 90;
      }
      return this.events;
    }

    // STEP 3: Move May (Jump, Dash, Jump pads, Wind, Fall check)
    const move = input.move || [0, 0];
    const camYaw = input.cam_yaw_deg || 0;
    const [dx, dz] = transformMove(move, camYaw);

    if (dx !== 0 || dz !== 0) {
      this.player.facing = [dx, dz];
    }

    // Dash (Rising edge)
    const isDash = Boolean(input.dash);
    const dashTriggered = isDash && !this.player.prev_dash;
    this.player.prev_dash = isDash;

    const canDash = this.player.charm_ticks > 0 || this.player.dash_cd_ticks === 0;
    if (dashTriggered && canDash && this.player.dash_ticks_left === 0) {
      this.player.dash_ticks_left = 12; // 0.2s = 12 ticks
      if (this.player.charm_ticks <= 0) {
        this.player.dash_cd_ticks = 90; // 1.5s = 90 ticks
      }
      const [dNormX, dNormZ] = (dx !== 0 || dz !== 0) ? [dx, dz] : this.player.facing;
      this.player.dash_dir = [dNormX, dNormZ];
      this.events.push({ type: 'event', tick: this.tick, name: 'dash', data: {} });
    }

    // Jump (Rising edge, only when grounded)
    const isJump = Boolean(input.jump);
    const jumpTriggered = isJump && !this.player.prev_jump;
    this.player.prev_jump = isJump;

    if (jumpTriggered && this.player.grounded && this.player.dash_ticks_left === 0) {
      this.player.vel[1] = 7.0; // Jump vel
      this.player.grounded = false;
    }

    // Jump Pads
    for (const pad of this.jump_pads) {
      if (distanceXZ(this.player.pos, pad.pos) <= 1.0 && this.player.grounded) {
        this.player.vel[1] = pad.vy;
        const angle = Math.atan2(pad.target[2] - pad.pos[2], pad.target[0] - pad.pos[0]);
        this.player.vel[0] = pad.vh * Math.cos(angle);
        this.player.vel[2] = pad.vh * Math.sin(angle);
        this.player.grounded = false;
        break;
      }
    }

    // Velocity computation
    const baseSpeed = this.player.charm_ticks > 0 ? 7.2 : this.tuning.player_speed;

    if (this.player.dash_ticks_left > 0) {
      this.player.dash_ticks_left -= 1;
      this.player.pos[0] = round3(this.player.pos[0] + (this.player.dash_dir[0] * 14.0) / 60);
      this.player.pos[2] = round3(this.player.pos[2] + (this.player.dash_dir[1] * 14.0) / 60);
    } else {
      if (this.player.grounded) {
        this.player.vel[0] = dx * baseSpeed;
        this.player.vel[2] = dz * baseSpeed;
      } else {
        if (this.player.vel[0] === 0 && this.player.vel[2] === 0) {
          this.player.vel[0] = dx * baseSpeed;
          this.player.vel[2] = dz * baseSpeed;
        }
        this.player.vel[1] -= 20.0 / 60; // Gravity
      }

      if (this.wind.active) {
        const wRad = (this.wind.dir_deg * Math.PI) / 180;
        this.player.vel[0] += 2.0 * Math.cos(wRad);
        this.player.vel[2] += 2.0 * Math.sin(wRad);
      }

      this.player.pos[0] = round3(this.player.pos[0] + this.player.vel[0] / 60);
      this.player.pos[1] = round3(this.player.pos[1] + this.player.vel[1] / 60);
      this.player.pos[2] = round3(this.player.pos[2] + this.player.vel[2] / 60);
    }

    // Floor collision
    const floorY = getGroundHeight(this.player.pos[0], this.player.pos[2], this.night);
    if (floorY !== null && this.player.pos[1] <= floorY) {
      this.player.pos[1] = floorY;
      this.player.vel[1] = 0;
      this.player.grounded = true;
    } else if (floorY === null || this.player.pos[1] > floorY) {
      if (this.player.dash_ticks_left === 0) {
        this.player.grounded = false;
      }
    }

    // Fall off island (Y < -10)
    if (this.player.pos[1] < -10.0) {
      this.player.flames -= 1;
      const totalLost = this.player.carried;
      this.player.carried = 0;
      this.player.respawn_wait_ticks = 60;

      this.events.push({
        type: 'event',
        tick: this.tick,
        name: 'player_hit',
        data: {
          by: 'fall',
          flames: this.player.flames,
          dropped: 0,
          lost: totalLost
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
      return this.events;
    }

    // STEP 4: Pick up motes and charms
    const currentCap = this.capacity;
    const remainingMotes = [];
    for (const m of this.motes) {
      const distXZ = distanceXZ(this.player.pos, m.pos);
      const dy = Math.abs(this.player.pos[1] - m.pos[1]);
      if (distXZ <= this.tuning.pickup_radius && dy <= 1.5 && this.player.carried < currentCap) {
        this.player.carried += 1;
        this.score += 5; // Phase 3: +5 score per mote
        this.events.push({
          type: 'event',
          tick: this.tick,
          name: 'mote_picked',
          data: { carried: this.player.carried }
        });
      } else {
        remainingMotes.push(m);
      }
    }
    this.motes = remainingMotes;

    // Charms
    for (const c of this.charms) {
      if (c.available && distanceXZ(this.player.pos, c.pos) <= 1.0) {
        c.available = false;
        c.respawn_ticks = 2700;
        this.player.charm_ticks = 600;
        this.events.push({
          type: 'event',
          tick: this.tick,
          name: 'charm_picked',
          data: { charm_id: c.id, charm_ticks: 600 }
        });
      }
    }

    // STEP 5: Interact with Lantern (Refuel / Relight / Light)
    const isInteract = Boolean(input.interact);
    const interactTriggered = isInteract && !this.player.prev_interact;
    this.player.prev_interact = isInteract;

    if (interactTriggered && this.player.carried > 0) {
      // Find lanterns that can accept motes (unlit, or lit but fuel < 100)
      const validLanterns = this.lanterns.filter((l) => {
        if (!l.lit) return true;
        return l.fuel < 100.0;
      });

      let targetLantern = null;
      let minDist = Infinity;
      for (const l of validLanterns) {
        const d = distanceXZ(this.player.pos, l.pos);
        if (d <= this.tuning.interact_radius) {
          if (d < minDist || (d === minDist && l.id < targetLantern.id)) {
            minDist = d;
            targetLantern = l;
          }
        }
      }

      if (targetLantern) {
        if (!targetLantern.lit) {
          // Depositing to light/relight
          const cost = targetLantern.ever_lit ? this.tuning.relight_cost : this.tuning.lantern_cost;
          const needed = cost - targetLantern.deposited;
          const depositAmount = Math.min(this.player.carried, needed);

          if (depositAmount > 0) {
            this.player.carried -= depositAmount;
            targetLantern.deposited += depositAmount;
            this.score += 5 * depositAmount;

            this.events.push({
              type: 'event',
              tick: this.tick,
              name: 'deposit',
              data: {
                lantern_id: targetLantern.id,
                amount: depositAmount,
                deposited: targetLantern.deposited
              }
            });

            if (targetLantern.deposited >= cost) {
              targetLantern.lit = true;
              targetLantern.fuel = 100.0;
              this.successful_lights += 1;
              targetLantern.just_lit_ticks = 30;

              const isRelight = targetLantern.ever_lit;
              if (isRelight) {
                targetLantern.relit_count = (targetLantern.relit_count || 0) + 1;
                this.score += this.tuning.score.per_relight;
              } else {
                targetLantern.ever_lit = true;
                this.score += this.tuning.score.per_lantern;
              }

              this.events.push({
                type: 'event',
                tick: this.tick,
                name: 'lantern_lit',
                data: {
                  lantern_id: targetLantern.id,
                  relight: isRelight
                }
              });
            }
          }
        } else {
          // Refueling a lit lantern
          const neededMotes = Math.ceil((100.0 - targetLantern.fuel) / 10.0);
          const used = Math.min(this.player.carried, neededMotes);

          if (used > 0) {
            this.player.carried -= used;
            targetLantern.fuel = Math.min(100.0, targetLantern.fuel + 10.0 * used);
            this.score += 5 * used;

            this.events.push({
              type: 'event',
              tick: this.tick,
              name: 'refuel',
              data: {
                lantern_id: targetLantern.id,
                amount: used,
                fuel: round1(targetLantern.fuel)
              }
            });

            if (targetLantern.fuel >= 30.0) {
              targetLantern.just_lit_ticks = 30; // Push out shades
            }
          }
        }
      }
    }

    // STEP 6: Update Safe Zone (Lit lanterns with fuel >= 30 push out shades)
    for (const l of this.lanterns) {
      if (l.lit && l.fuel >= 30.0 && l.just_lit_ticks > 0) {
        for (const shade of this.shades) {
          const dist = distanceXZ(shade.pos, l.pos);
          if (dist < this.tuning.safe_radius) {
            const angle = Math.atan2(shade.pos[2] - l.pos[2], shade.pos[0] - l.pos[0]) || 0;
            shade.pos[0] = round3(l.pos[0] + this.tuning.safe_radius * Math.cos(angle));
            shade.pos[2] = round3(l.pos[2] + this.tuning.safe_radius * Math.sin(angle));
          }
        }
      }
    }

    // STEP 7: Pulse (Rising edge)
    const isPulse = Boolean(input.pulse);
    const pulseTriggered = isPulse && !this.player.prev_pulse;
    this.player.prev_pulse = isPulse;

    if (pulseTriggered && this.player.pulse_cd_ticks === 0) {
      if (this.player.carried >= this.tuning.pulse_cost) {
        this.player.carried -= this.tuning.pulse_cost;
        this.player.pulse_cd_ticks = 180; // 3s

        const pulseOrigin = [this.player.pos[0], this.player.pos[1] + 0.8, this.player.pos[2]];
        const stunned_ids = [];

        // Pulse vs Shades
        for (const shade of this.shades) {
          const dx3 = shade.pos[0] - pulseOrigin[0];
          const dy3 = shade.pos[1] - pulseOrigin[1];
          const dz3 = shade.pos[2] - pulseOrigin[2];
          const dist3D = Math.sqrt(dx3 * dx3 + dy3 * dy3 + dz3 * dz3);

          if (dist3D <= this.tuning.pulse_radius) {
            stunned_ids.push(shade.id);

            const wasDraining = (shade.state === 'drain');
            shade.state = 'stunned';
            shade.state_ticks_left = 120;
            shade.push_ticks_left = 15;

            const pushAngle = (shade.pos[0] === this.player.pos[0] && shade.pos[2] === this.player.pos[2])
              ? 0
              : Math.atan2(shade.pos[2] - this.player.pos[2], shade.pos[0] - this.player.pos[0]);
            shade.push_dir = [Math.cos(pushAngle), Math.sin(pushAngle)];

            // +15 if was draining, else +5
            this.score += wasDraining ? this.tuning.score.per_stun_drain : this.tuning.score.per_stun;
          }
        }

        // Pulse vs Drifters
        for (const drifter of this.drifters) {
          const dist = distanceXZ(this.player.pos, drifter.pos);
          if (dist <= this.tuning.pulse_radius) {
            if (drifter.state === 'chase') {
              drifter.state = 'flee';
              drifter.flee_ticks_left = 240;
            } else if (drifter.state === 'flee' && drifter.stolen > 0) {
              for (let d = 0; d < drifter.stolen; d++) {
                this.motes.push({
                  id: `M_drift_drop_${this.tick}_${d}`,
                  pos: [...drifter.pos],
                  kind: 'dropped',
                  ttl_ticks: 480
                });
              }
              this.events.push({
                type: 'event',
                tick: this.tick,
                name: 'drifter_drop',
                data: { drifter_id: drifter.id, amount: drifter.stolen }
              });
              drifter.stolen = 0;
              drifter.flee_ticks_left = 120;
            }
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

    // STEP 8: Move Shades and Drifters
    const shadeSpeed = (this.night === 3 ? 4.5 : 4.0) / 60;
    for (const shade of this.shades) {
      if (shade.state === 'stunned') {
        if (shade.push_ticks_left > 0) {
          shade.push_ticks_left -= 1;
          shade.pos[0] = round3(shade.pos[0] + (shade.push_dir[0] * 4.0) / 15);
          shade.pos[2] = round3(shade.pos[2] + (shade.push_dir[1] * 4.0) / 15);
        }
        shade.state_ticks_left -= 1;
        if (shade.state_ticks_left <= 0) {
          shade.state = 'wander'; // Hết choáng thì về wander
        }
        continue;
      }

      if (shade.state === 'recoil') {
        shade.state_ticks_left -= 1;
        shade.pos[0] = round3(shade.pos[0] + (shade.recoil_dir[0] * 2.0) / 60);
        shade.pos[2] = round3(shade.pos[2] + (shade.recoil_dir[1] * 2.0) / 60);
        if (shade.state_ticks_left <= 0) {
          shade.state = 'chase';
        }
        continue;
      }

      if (shade.state === 'drain') {
        // Draining: stays still
        const targetLantern = this.lanterns.find((l) => l.id === shade.target_lantern_id);
        const distToTarget = targetLantern ? distanceXZ(shade.pos, targetLantern.pos) : Infinity;
        const distToPlayer = distanceXZ(shade.pos, this.player.pos);

        if (distToPlayer <= 6.0) {
          shade.state = 'chase'; // Mây vào trong 6m -> chase
        } else if (!targetLantern || !targetLantern.lit || targetLantern.fuel <= 0 || targetLantern.fuel >= 30.0 || distToTarget > 2.0) {
          shade.state = 'wander';
        }
        continue;
      }

      // Check wander vs chase
      const distToPlayer = distanceXZ(shade.pos, this.player.pos);
      if (shade.state === 'wander' && distToPlayer <= 12.0) {
        shade.state = 'chase';
      } else if (shade.state === 'chase' && distToPlayer >= 18.0) {
        shade.state = 'wander';
      }

      if (shade.state === 'wander') {
        // Look for closest weak lantern (fuel < 30)
        let weakLantern = null;
        let minWDist = Infinity;
        for (const l of this.lanterns) {
          if (l.lit && l.fuel < 30.0) {
            const d = distanceXZ(shade.pos, l.pos);
            if (d < minWDist || (d === minWDist && l.id < weakLantern.id)) {
              minWDist = d;
              weakLantern = l;
            }
          }
        }

        if (weakLantern) {
          shade.target_lantern_id = weakLantern.id;
          const distToWeak = distanceXZ(shade.pos, weakLantern.pos);
          if (distToWeak <= 2.0) {
            shade.state = 'drain';
            shade.drain_ticks = 0;
          } else {
            const dx = (weakLantern.pos[0] - shade.pos[0]) / distToWeak;
            const dz = (weakLantern.pos[2] - shade.pos[2]) / distToWeak;
            shade.pos[0] = round3(shade.pos[0] + dx * shadeSpeed);
            shade.pos[2] = round3(shade.pos[2] + dz * shadeSpeed);
          }
        }
      } else if (shade.state === 'chase') {
        let blockedBySafeZone = false;
        for (const l of this.lanterns) {
          if (l.lit && l.fuel >= 30.0 && distanceXZ(this.player.pos, l.pos) <= this.tuning.safe_radius) {
            blockedBySafeZone = true;
            break;
          }
        }

        if (!blockedBySafeZone && distToPlayer > 0.05) {
          const dx = (this.player.pos[0] - shade.pos[0]) / distToPlayer;
          const dz = (this.player.pos[2] - shade.pos[2]) / distToPlayer;
          const nextX = shade.pos[0] + dx * shadeSpeed;
          const nextZ = shade.pos[2] + dz * shadeSpeed;

          let safeZoneEdge = false;
          for (const l of this.lanterns) {
            if (l.lit && l.fuel >= 30.0 && distanceXZ([nextX, 0, nextZ], l.pos) < this.tuning.safe_radius) {
              safeZoneEdge = true;
              break;
            }
          }

          if (!safeZoneEdge) {
            shade.pos[0] = round3(nextX);
            shade.pos[2] = round3(nextZ);
          }
        }
      }
    }

    // Move Drifters (7 m/s)
    const drifterSpeed = 7.0 / 60;
    for (const drifter of this.drifters) {
      const dist = distanceXZ(drifter.pos, this.player.pos);
      if (drifter.state === 'idle') {
        if (this.player.carried >= 5 && dist <= 15.0) {
          drifter.state = 'chase';
        }
      } else if (drifter.state === 'chase') {
        if (this.player.carried < 5 || dist > 15.0) {
          drifter.state = 'idle';
        } else if (dist > 0.05) {
          const dx = (this.player.pos[0] - drifter.pos[0]) / dist;
          const dz = (this.player.pos[2] - drifter.pos[2]) / dist;
          drifter.pos[0] = round3(drifter.pos[0] + dx * drifterSpeed);
          drifter.pos[2] = round3(drifter.pos[2] + dz * drifterSpeed);
        }
      } else if (drifter.state === 'flee') {
        drifter.flee_ticks_left -= 1;
        const dx = (drifter.pos[0] - this.player.pos[0]) / (dist || 1);
        const dz = (drifter.pos[2] - this.player.pos[2]) / (dist || 1);
        drifter.pos[0] = round3(drifter.pos[0] + dx * drifterSpeed);
        drifter.pos[2] = round3(drifter.pos[2] + dz * drifterSpeed);
        if (drifter.flee_ticks_left <= 0) {
          drifter.state = 'removed';
        }
      }
    }
    this.drifters = this.drifters.filter((d) => d.state !== 'removed');

    // STEP 9: Hits (Drifter steals first, then Shade hits in ascending id order)
    for (const drifter of this.drifters) {
      if (drifter.state === 'chase' && distanceXZ(drifter.pos, this.player.pos) <= 1.2) {
        const stealAmount = Math.min(3, this.player.carried);
        if (stealAmount > 0) {
          this.player.carried -= stealAmount;
          drifter.stolen = stealAmount;
          drifter.state = 'flee';
          drifter.flee_ticks_left = 240;
          this.events.push({
            type: 'event',
            tick: this.tick,
            name: 'drifter_steal',
            data: { drifter_id: drifter.id, amount: stealAmount, carried: this.player.carried }
          });
        }
      }
    }

    const sortedShades = [...this.shades].sort((a, b) => a.id.localeCompare(b.id));
    let hitThisTick = false;
    for (const shade of sortedShades) {
      if (hitThisTick) break;
      if (shade.state === 'stunned') continue;

      const distXZ = distanceXZ(shade.pos, this.player.pos);
      const dy = Math.abs(shade.pos[1] - this.player.pos[1]);

      if (distXZ <= this.tuning.shade_hit_radius && dy <= 1.5) {
        if (this.player.invuln_ticks === 0) {
          hitThisTick = true;
          this.player.flames -= 1;
          this.player.invuln_ticks = 90;

          const dropped = Math.floor(this.player.carried / 2);
          this.player.carried -= dropped;

          for (let d = 0; d < dropped; d++) {
            const dropAngle = (d * 2 * Math.PI) / (dropped || 1);
            const dropR = 2.0;
            this.motes.push({
              id: `M_drop_${this.tick}_${d}`,
              pos: [
                round3(this.player.pos[0] + dropR * Math.cos(dropAngle)),
                0.0,
                round3(this.player.pos[2] + dropR * Math.sin(dropAngle))
              ],
              kind: 'dropped',
              ttl_ticks: 480
            });
          }

          shade.state = 'recoil';
          shade.state_ticks_left = 60;
          const recoilAngle = Math.atan2(shade.pos[2] - this.player.pos[2], shade.pos[0] - this.player.pos[0]) || 0;
          shade.recoil_dir = [Math.cos(recoilAngle), Math.sin(recoilAngle)];

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
    }

    // STEP 10: Spawns by schedule
    if (this.tick % 240 === 0 && this.motes.length < 30) {
      const r = this.prng.range(10, 35);
      const theta = this.prng.range(0, Math.PI * 2);
      this.motes.push({
        id: `M_spawn_${this.tick}`,
        pos: [round3(r * Math.cos(theta)), 0.0, round3(r * Math.sin(theta))],
        kind: 'random',
        ttl_ticks: null
      });
    }

    const spawnInterval = this.mapData.shade_spawn_interval_ticks;
    const shouldSpawnShade = (this.tick === 300) || (this.tick > 300 && (this.tick - 300) % spawnInterval === 0);
    if (shouldSpawnShade && this.shades.length < this.mapData.max_shades) {
      const countToSpawn = (this.tick === 300) ? 2 : 1;
      for (let s = 0; s < countToSpawn && this.shades.length < this.mapData.max_shades; s++) {
        this.total_shades_spawned += 1;
        const newId = `S${this.total_shades_spawned}`;
        const sTheta = this.prng.range(0, Math.PI * 2);
        this.shades.push({
          id: newId,
          pos: [round3(37 * Math.cos(sTheta)), 0.0, round3(37 * Math.sin(sTheta))],
          state: 'wander',
          state_ticks_left: 0
        });
        this.events.push({
          type: 'event',
          tick: this.tick,
          name: 'shade_spawned',
          data: { id: newId }
        });
      }
    }

    if (this.night >= 2 && this.random_drifters && this.tick % 1200 === 0 && this.drifters.length < 2) {
      this.total_drifters_spawned += 1;
      const dId = `D${this.total_drifters_spawned}`;
      const dTheta = this.prng.range(0, Math.PI * 2);
      this.drifters.push({
        id: dId,
        pos: [round3(25 * Math.cos(dTheta)), 1.5, round3(25 * Math.sin(dTheta))],
        state: 'idle',
        stolen: 0,
        flee_ticks_left: 0
      });
    }

    // STEP 11: Check Win / Loss (Ticket-03: No early win!)
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

    // Check Dawn (Time expired)
    if (this.time_left_s <= 0) {
      const litLanterns = this.lanterns.filter((l) => l.lit);
      const requiredLit = Math.ceil(0.6 * this.lanterns.length);

      if (litLanterns.length >= requiredLit) {
        this.state = 'won';
        // Scoring at dawn
        for (const l of litLanterns) {
          this.score += 50 + Math.floor(l.fuel);
        }
        this.score += this.player.flames * 50;

        this.events.push({
          type: 'event',
          tick: this.tick,
          name: 'game_over',
          data: { result: 'won', reason: 'dawn_survived' }
        });
      } else {
        this.state = 'lost';
        this.events.push({
          type: 'event',
          tick: this.tick,
          name: 'game_over',
          data: { result: 'lost', reason: 'dawn' }
        });
      }
      return this.events;
    }

    return this.events;
  }

  getSnapshot() {
    return {
      type: 'snapshot',
      tick: this.tick,
      sim_tick: this.sim_tick,
      night: this.night,
      state: this.state,
      time_left_s: round3(this.time_left_s),
      score: this.score,
      player: {
        pos: [round3(this.player.pos[0]), round3(this.player.pos[1]), round3(this.player.pos[2])],
        vel: [round3(this.player.vel[0]), round3(this.player.vel[1]), round3(this.player.vel[2])],
        flames: this.player.flames,
        carried: this.player.carried,
        capacity: this.capacity,
        grounded: this.player.grounded,
        invuln: this.player.invuln_ticks > 0,
        dash_cd_s: round3(this.player.dash_cd_ticks / 60),
        pulse_cd_s: round3(this.player.pulse_cd_ticks / 60),
        charm_s: round3(this.player.charm_ticks / 60)
      },
      lanterns: this.lanterns.map((l) => ({
        id: l.id,
        pos: [round3(l.pos[0]), round3(l.pos[1]), round3(l.pos[2])],
        lit: l.lit,
        fuel: round1(l.fuel),
        deposited: l.deposited,
        ever_lit: l.ever_lit,
        relit_count: l.relit_count || 0
      })),
      shades: this.shades.map((s) => ({
        id: s.id,
        pos: [round3(s.pos[0]), round3(s.pos[1]), round3(s.pos[2])],
        state: s.state
      })),
      motes: this.motes.map((m) => ({
        id: m.id,
        pos: [round3(m.pos[0]), round3(m.pos[1]), round3(m.pos[2])],
        kind: m.kind,
        ttl_s: m.ttl_ticks !== null ? round3(m.ttl_ticks / 60) : null
      })),
      drifters: this.drifters.map((d) => ({
        id: d.id,
        pos: [round3(d.pos[0]), round3(d.pos[1]), round3(d.pos[2])],
        state: d.state,
        stolen: d.stolen
      })),
      charms: this.charms.map((c) => ({
        id: c.id,
        available: c.available,
        respawn_s: round3(c.respawn_ticks / 60)
      })),
      wind: {
        active: this.wind.active,
        dir_deg: this.wind.dir_deg
      },
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
