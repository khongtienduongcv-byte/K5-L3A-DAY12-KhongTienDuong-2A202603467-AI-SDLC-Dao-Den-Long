import { describe, it, expect } from 'vitest';
import { GameEngine } from '../src/core/engine.js';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

describe('Test Contract v1.1 & Phase 2 Features', () => {
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

  it('should pick up motes within v1.1 radius (1.0m)', () => {
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
    expect(engine.score).toBe(10);
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
    expect(engine.player.pos[2]).toBeCloseTo(0.233, 2); // 14 / 60 = ~0.233m
  });

  it('should jump and apply gravity -20 m/s^2', () => {
    const engine = new GameEngine({
      scenario: {
        player: { pos: [0, 0, 0], carried: 0, flames: 3 },
        random_motes: false,
        random_shades: false
      }
    });

    // Jump
    engine.step({ jump: true });
    expect(engine.player.grounded).toBe(false);
    expect(engine.player.pos[1]).toBeGreaterThan(0);
  });

  it('should deposit into lantern and light it at 10 motes (v1.1 cost)', () => {
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
    expect(events.some((e) => e.name === 'lantern_lit')).toBe(true);
    expect(engine.player.carried).toBe(0);
    const l1 = engine.lanterns.find((l) => l.id === 'L1');
    expect(l1.lit).toBe(true);
    expect(l1.deposited).toBe(10);
  });

  it('should pulse and stun shades with 3 motes cost', () => {
    const scenario = {
      player: { pos: [0, 0, 0], carried: 3, flames: 3 },
      random_motes: false,
      random_shades: false,
      shades: [{ id: 'S1', pos: [3.0, 0, 0] }],
      motes: []
    };

    const engine = new GameEngine({ scenario });
    const events = engine.step({ pulse: true });

    const pulseEvt = events.find((e) => e.name === 'pulse');
    expect(pulseEvt).toBeDefined();
    expect(pulseEvt.data.stunned_ids).toContain('S1');
    expect(engine.shades[0].state).toBe('stunned');
    expect(engine.player.carried).toBe(0); // 3 - 3 = 0
  });

  it('should handle Drifter (Gió Lạc) stealing motes and dropping on pulse', () => {
    const scenario = {
      player: { pos: [0, 0, 0], carried: 6, flames: 3 },
      random_motes: false,
      random_shades: false,
      drifters: [{ id: 'D1', pos: [1.0, 0, 0], state: 'chase', stolen: 0 }]
    };

    const engine = new GameEngine({ night: 2, scenario });
    // Step 1: drifter steals min(3, carried) = 3
    const events1 = engine.step({});
    expect(events1.some((e) => e.name === 'drifter_steal')).toBe(true);
    expect(engine.player.carried).toBe(3);
    expect(engine.drifters[0].stolen).toBe(3);
    expect(engine.drifters[0].state).toBe('flee');

    // Step 2: pulse causes fleeing drifter to drop stolen motes
    const events2 = engine.step({ pulse: true });
    expect(events2.some((e) => e.name === 'drifter_drop')).toBe(true);
    expect(engine.drifters[0].stolen).toBe(0);
  });

  it('should pick up Wind Charm and activate zero-cooldown dash buff', () => {
    const scenario = {
      player: { pos: [0, 0, 0], carried: 0, flames: 3 },
      charms: [{ id: 'C1', pos: [0.5, 0, 0], available: true }]
    };

    const engine = new GameEngine({ night: 2, scenario });
    const events = engine.step({});

    expect(events.some((e) => e.name === 'charm_picked')).toBe(true);
    expect(engine.player.charm_ticks).toBe(600);
  });

  it('should pause and resume simulation on pause input rising edge', () => {
    const engine = new GameEngine();
    const pauseEvents = engine.step({ pause: true });
    expect(pauseEvents.some((e) => e.name === 'paused')).toBe(true);
    expect(engine.state).toBe('paused');

    engine.step({ pause: false }); // Release key
    const resumeEvents = engine.step({ pause: true }); // Press again
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
});
