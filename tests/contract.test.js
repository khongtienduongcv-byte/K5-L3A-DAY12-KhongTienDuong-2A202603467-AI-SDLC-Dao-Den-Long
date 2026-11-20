import { describe, it, expect } from 'vitest';
import { GameEngine } from '../src/core/engine.js';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

describe('Test Contract v1.0 & Engine Logic', () => {
  it('should deterministically produce identical snapshots given the same seed and inputs', () => {
    const engine1 = new GameEngine({ seed: 12345 });
    const engine2 = new GameEngine({ seed: 12345 });

    const inputs = { move: [0, 1], cam_yaw_deg: 45 };

    for (let i = 0; i < 100; i++) {
      engine1.step(inputs);
      engine2.step(inputs);
    }

    expect(engine1.getSnapshot()).toEqual(engine2.getSnapshot());
    expect(engine1.getEnd()).toEqual(engine2.getEnd());
  });

  it('should pick up motes within pickup radius', () => {
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

  it('should deposit motes into lantern and light it when reaching cost', () => {
    const scenario = {
      player: { pos: [0, 0, 24.0], carried: 3, flames: 3 },
      random_motes: false,
      random_shades: false,
      lanterns: [{ id: 'L1', pos: [0, 0, 25.0], deposited: 0, lit: false }],
      motes: [],
      shades: []
    };

    const engine = new GameEngine({ scenario });
    // Frame 1: interact = true
    const events = engine.step({ interact: true });

    expect(events.some((e) => e.name === 'deposit')).toBe(true);
    expect(events.some((e) => e.name === 'lantern_lit')).toBe(true);
    expect(engine.player.carried).toBe(0);
    const l1 = engine.lanterns.find((l) => l.id === 'L1');
    expect(l1.lit).toBe(true);
  });

  it('should pulse and stun shades within pulse_radius', () => {
    const scenario = {
      player: { pos: [0, 0, 0], carried: 2, flames: 3 },
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
    expect(engine.player.carried).toBe(1); // Consumed 1 mote
  });

  it('should win when all 5 lanterns are lit', () => {
    const scenario = {
      player: { pos: [0, 0, 24.0], carried: 1, flames: 3 },
      random_motes: false,
      random_shades: false,
      lanterns: [
        { id: 'L1', pos: [0, 0, 25.0], deposited: 2, lit: false },
        { id: 'L2', lit: true },
        { id: 'L3', lit: true },
        { id: 'L4', lit: true },
        { id: 'L5', lit: true }
      ],
      motes: [],
      shades: []
    };

    const engine = new GameEngine({ scenario });
    const events = engine.step({ interact: true });

    expect(events.some((e) => e.name === 'game_over' && e.data.result === 'won')).toBe(true);
    expect(engine.state).toBe('won');
  });

  it('should exit with code 2 on malformed scenario JSON in CLI', () => {
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
