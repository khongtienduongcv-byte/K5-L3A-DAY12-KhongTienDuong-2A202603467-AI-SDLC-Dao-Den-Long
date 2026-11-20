import { describe, it, expect } from 'vitest';
import { GameEngine } from '../src/core/engine.js';
import { sanitizeName, sortAndLimitEntries } from '../src/core/leaderboard.js';
import { loadFileLeaderboard, saveFileLeaderboard, addFileEntry } from '../src/cli/leaderboard.js';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

describe('Test Contract v1.2 & Phase 3 Core Rules', () => {
  it('should deterministically produce identical snapshots given the same seed and inputs', () => {
    const engine1 = new GameEngine({ seed: 12345, night: 1 });
    const engine2 = new GameEngine({ seed: 12345, night: 1 });

    const inputs = { move: [0, 1], cam_yaw_deg: 45 };

    for (let i = 0; i < 60; i++) {
      engine1.step(inputs);
      engine2.step(inputs);
    }

    expect(engine1.getSnapshot()).toEqual(engine2.getSnapshot());
    expect(engine1.getEnd()).toEqual(engine2.getEnd());
  });

  it('should pick up motes within v1.2 radius (1.0m) with Phase 3 score (+5)', () => {
    const scenario = {
      player: { pos: [0, 0, 0], carried: 0, flames: 3 },
      random_motes: false,
      random_shades: false,
      motes: [[0, 0, 0.5]],
      shades: []
    };

    const engine = new GameEngine({ scenario });
    const events = engine.step({ move: [0, 0] });

    expect(events.some((e) => e.name === 'mote_picked')).toBe(true);
    expect(engine.player.carried).toBe(1);
    expect(engine.score).toBe(5); // Phase 3: +5 score per mote
  });

  it('should dash at 14 m/s and emit dash event', () => {
    const engine = new GameEngine({
      scenario: {
        player: { pos: [0, 0, 0], carried: 0, flames: 3 },
        random_motes: false,
        random_shades: false
      }
    });

    const events = engine.step({ move: [0, 1], dash: true });
    expect(events.some((e) => e.name === 'dash')).toBe(true);
    expect(engine.player.pos[2]).toBeCloseTo(0.233, 2);
  });

  it('should jump and apply gravity -20 m/s^2', () => {
    const engine = new GameEngine({
      scenario: {
        player: { pos: [0, 0, 0], carried: 0, flames: 3 },
        random_motes: false,
        random_shades: false
      }
    });

    engine.step({ jump: true });
    expect(engine.player.grounded).toBe(false);
    expect(engine.player.pos[1]).toBeGreaterThan(0);
  });

  it('should deposit 10 motes to light a new lantern with 100 fuel', () => {
    const scenario = {
      player: { pos: [0, 0, 24.0], carried: 10, flames: 3 },
      random_motes: false,
      random_shades: false,
      lanterns: [{ id: 'L1', pos: [0, 0, 25.0], deposited: 0, lit: false }],
      motes: [],
      shades: []
    };

    const engine = new GameEngine({ scenario });
    const events = engine.step({ interact: true });

    expect(events.some((e) => e.name === 'deposit')).toBe(true);
    const litEvt = events.find((e) => e.name === 'lantern_lit');
    expect(litEvt).toBeDefined();
    expect(litEvt.data.relight).toBe(false);
    expect(engine.player.carried).toBe(0);

    const l1 = engine.lanterns.find((l) => l.id === 'L1');
    expect(l1.lit).toBe(true);
    expect(l1.fuel).toBe(100.0);
    expect(engine.capacity).toBe(12); // Capacity increased by 2
  });

  it('should relight an ever_lit lantern with only 5 motes', () => {
    const scenario = {
      player: { pos: [0, 0, 24.0], carried: 5, flames: 3 },
      random_motes: false,
      random_shades: false,
      lanterns: [{ id: 'L1', pos: [0, 0, 25.0], deposited: 0, lit: false, ever_lit: true }],
      motes: [],
      shades: []
    };

    const engine = new GameEngine({ scenario });
    const events = engine.step({ interact: true });

    const litEvt = events.find((e) => e.name === 'lantern_lit');
    expect(litEvt).toBeDefined();
    expect(litEvt.data.relight).toBe(true);
    expect(engine.player.carried).toBe(0);
  });

  it('should refuel a lit lantern with fuel < 100', () => {
    const scenario = {
      player: { pos: [0, 0, 24.0], carried: 2, flames: 3 },
      random_motes: false,
      random_shades: false,
      lanterns: [{ id: 'L1', pos: [0, 0, 25.0], lit: true, fuel: 80.0 }],
      motes: [],
      shades: []
    };

    const engine = new GameEngine({ scenario });
    const events = engine.step({ interact: true });

    const refuelEvt = events.find((e) => e.name === 'refuel');
    expect(refuelEvt).toBeDefined();
    expect(refuelEvt.data.amount).toBe(2);
    expect(refuelEvt.data.fuel).toBe(100.0);
    expect(engine.player.carried).toBe(0);
  });

  it('should decay fuel and turn off lantern with lantern_out event', () => {
    const scenario = {
      player: { pos: [0, 0, 0], carried: 0, flames: 3 },
      random_motes: false,
      random_shades: false,
      lanterns: [{ id: 'L1', pos: [0, 0, 25.0], lit: true, fuel: 0.05 }],
      motes: [],
      shades: []
    };

    const engine = new GameEngine({ scenario });
    // In 4 ticks (4 * 1/60 = 0.066 > 0.05), fuel drops to 0
    let events = [];
    for (let i = 0; i < 4; i++) {
      events = events.concat(engine.step({}));
    }

    expect(events.some((e) => e.name === 'lantern_out')).toBe(true);
    const l1 = engine.lanterns.find((l) => l.id === 'L1');
    expect(l1.lit).toBe(false);
    expect(l1.ever_lit).toBe(true);
  });

  it('should allow wander shade to target and drain weak lantern (fuel < 30)', () => {
    const scenario = {
      player: { pos: [20, 0, 0], carried: 0, flames: 3 },
      random_motes: false,
      random_shades: false,
      lanterns: [{ id: 'L1', pos: [0, 0, 25.0], lit: true, fuel: 25.0 }],
      shades: [{ id: 'S1', pos: [0, 0, 24.0], state: 'wander' }],
      motes: []
    };

    const engine = new GameEngine({ scenario });
    engine.step({});

    expect(engine.shades[0].state).toBe('drain');

    // Run 60 ticks to verify fuel_drain event
    let drainEvents = [];
    for (let i = 0; i < 60; i++) {
      drainEvents = drainEvents.concat(engine.step({}));
    }

    expect(drainEvents.some((e) => e.name === 'fuel_drain')).toBe(true);
  });

  it('should award +15 score when pulse stuns a draining shade', () => {
    const scenario = {
      player: { pos: [0, 0, 24.0], carried: 3, flames: 3 },
      random_motes: false,
      random_shades: false,
      lanterns: [{ id: 'L1', pos: [0, 0, 25.0], lit: true, fuel: 20.0 }],
      shades: [{ id: 'S1', pos: [0, 0, 24.5], state: 'drain', target_lantern_id: 'L1' }],
      motes: []
    };

    const engine = new GameEngine({ scenario });
    const initialScore = engine.score;
    engine.step({ pulse: true });

    expect(engine.shades[0].state).toBe('stunned');
    expect(engine.score - initialScore).toBe(15); // +15 for draining shade
  });

  // Updated in Phase 3: Ticket-03 replaced all_lit early win with dawn_survived win rule
  it('should win at dawn with reason dawn_survived when >= 60% lanterns are lit', () => {
    const scenario = {
      time_left_s: 0.05, // Almost dawn (lasts 3 ticks)
      player: { pos: [0, 0, 0], carried: 0, flames: 3 },
      random_motes: false,
      random_shades: false,
      lanterns: [
        { id: 'L1', lit: true, fuel: 50.0 },
        { id: 'L2', lit: true, fuel: 50.0 },
        { id: 'L3', lit: true, fuel: 50.0 },
        { id: 'L4', lit: false, fuel: 0.0 },
        { id: 'L5', lit: false, fuel: 0.0 }
      ],
      motes: [],
      shades: []
    };

    const engine = new GameEngine({ scenario });
    let events = [];
    for (let i = 0; i < 4; i++) {
      events = events.concat(engine.step({}));
    }

    const winEvt = events.find((e) => e.name === 'game_over');
    expect(winEvt).toBeDefined();
    expect(winEvt.data.result).toBe('won');
    expect(winEvt.data.reason).toBe('dawn_survived');
    expect(engine.state).toBe('won');
  });

  it('should pause and resume simulation on pause input rising edge', () => {
    const engine = new GameEngine();
    const pauseEvents = engine.step({ pause: true });
    expect(pauseEvents.some((e) => e.name === 'paused')).toBe(true);
    expect(engine.state).toBe('paused');

    engine.step({ pause: false });
    const resumeEvents = engine.step({ pause: true });
    expect(resumeEvents.some((e) => e.name === 'resumed')).toBe(true);
    expect(engine.state).toBe('playing');
  });

  it('should penalize player on falling off island (Y < -10)', () => {
    const scenario = {
      player: { pos: [50.0, -10.5, 0], carried: 5, flames: 3 },
      random_motes: false,
      random_shades: false
    };

    const engine = new GameEngine({ scenario });
    const events = engine.step({});

    const hitEvt = events.find((e) => e.name === 'player_hit');
    expect(hitEvt).toBeDefined();
    expect(hitEvt.data.by).toBe('fall');
    expect(hitEvt.data.lost).toBe(5);
    expect(engine.player.flames).toBe(2);
    expect(engine.player.carried).toBe(0);
  });

  it('should exit with code 2 on malformed scenario JSON', () => {
    const badJsonPath = path.resolve(process.cwd(), 'bad.json');
    fs.writeFileSync(badJsonPath, '{ invalid json', 'utf-8');
    try {
      execSync(`node src/cli/headless.js --scenario bad.json`, { stdio: 'pipe' });
      expect.fail('Should have failed with exit code 2');
    } catch (err) {
      expect(err.status).toBe(2);
    } finally {
      if (fs.existsSync(badJsonPath)) fs.unlinkSync(badJsonPath);
    }
  });

  describe('Phase 4 (Ticket-04) & Test Contract v1.3 Verifications', () => {
    it('should sanitize names to 3-12 alphanumeric characters', () => {
      expect(sanitizeName('A')).toBe('A__');
      expect(sanitizeName('May_Keeper_ExtraLongName')).toBe('May_Keeper_E');
      expect(sanitizeName('Hero$#123')).toBe('Hero123');
      expect(sanitizeName('Valid_Name_9')).toBe('Valid_Name_9');
    });

    it('should sort leaderboard by score desc, ties by date asc, and keep top 10', () => {
      const sample = [
        { name: 'P1', score: 100, achieved_at: '2026-11-20T10:05:00.000Z' },
        { name: 'P2', score: 250, achieved_at: '2026-11-20T10:00:00.000Z' },
        { name: 'P3', score: 100, achieved_at: '2026-11-20T10:01:00.000Z' },
        { name: 'P4', score: 50, achieved_at: '2026-11-20T10:00:00.000Z' }
      ];
      const sorted = sortAndLimitEntries(sample, 3);
      expect(sorted.length).toBe(3);
      expect(sorted[0].name).toBe('P2'); // 250
      expect(sorted[1].name).toBe('P3'); // 100 (earlier date 10:01 vs 10:05)
      expect(sorted[2].name).toBe('P1'); // 100
    });

    it('should export leaderboard via CLI and headless flags', () => {
      const outTemp = path.resolve(process.cwd(), 'temp_test_export.json');
      try {
        execSync(`node src/cli/leaderboard.js --export-leaderboard temp_test_export.json`, { stdio: 'pipe' });
        expect(fs.existsSync(outTemp)).toBe(true);
        const data = JSON.parse(fs.readFileSync(outTemp, 'utf-8'));
        expect(Array.isArray(data.entries)).toBe(true);
        expect(data.entries.length).toBeGreaterThanOrEqual(1);

        // Also test headless export flag
        fs.unlinkSync(outTemp);
        execSync(`node src/cli/headless.js --export-leaderboard temp_test_export.json`, { stdio: 'pipe' });
        expect(fs.existsSync(outTemp)).toBe(true);
        const dataHeadless = JSON.parse(fs.readFileSync(outTemp, 'utf-8'));
        expect(Array.isArray(dataHeadless.entries)).toBe(true);
      } finally {
        if (fs.existsSync(outTemp)) fs.unlinkSync(outTemp);
      }
    });

    it('should have bench.json meeting Contract v1.3 performance thresholds', () => {
      const benchPath = path.resolve(process.cwd(), 'bench.json');
      expect(fs.existsSync(benchPath)).toBe(true);
      const bench = JSON.parse(fs.readFileSync(benchPath, 'utf-8'));

      expect(bench.contract_version).toBe('1.3');
      expect(bench.avg_fps).toBeGreaterThanOrEqual(60);
      expect(bench.p1_low_fps).toBeGreaterThanOrEqual(30);
      expect(bench.load_ms).toBeLessThanOrEqual(10000);
      expect(bench.frames).toBeGreaterThan(0);
      expect(bench.peak_mem_mb).toBeGreaterThan(0);
    });

    it('should have soak.json meeting Contract v1.3 stability thresholds', () => {
      const soakPath = path.resolve(process.cwd(), 'soak.json');
      expect(fs.existsSync(soakPath)).toBe(true);
      const soak = JSON.parse(fs.readFileSync(soakPath, 'utf-8'));

      expect(soak.nights).toBe(10);
      expect(soak.crashes).toBe(0);
      expect(Array.isArray(soak.results)).toBe(true);
      expect(soak.results.length).toBe(10);
      expect(soak.mem_end_mb).toBeLessThanOrEqual(Math.round(1.2 * soak.mem_start_mb));
    });
  });
});
