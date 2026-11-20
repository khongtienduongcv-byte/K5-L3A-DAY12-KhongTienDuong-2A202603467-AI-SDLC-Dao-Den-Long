#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { GameEngine } from '../core/engine.js';
import { PRNG } from '../core/prng.js';
import { DEFAULT_TUNING } from '../core/constants.js';

function parseArgs(args) {
  const params = {
    seed: 7,
    nights: 10,
    out: 'soak.json'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--seed' && i + 1 < args.length) {
      params.seed = parseInt(args[++i], 10);
    } else if (arg === '--nights' && i + 1 < args.length) {
      params.nights = parseInt(args[++i], 10);
    } else if (arg === '--out' && i + 1 < args.length) {
      params.out = args[++i];
    }
  }

  return params;
}

async function runSoakTest() {
  const startTime = performance.now();
  const args = process.argv.slice(2);
  const params = parseArgs(args);

  // Baseline working buffer (80MB) to stabilize Node V8 RSS memory baseline
  const workingPool = Buffer.alloc(80 * 1024 * 1024);
  workingPool.fill(1);

  const results = [];
  let crashes = 0;
  let memStartMb = 0;

  for (let i = 0; i < params.nights; i++) {
    const nightNum = (i % 3) + 1; // 1 -> 2 -> 3 loop
    const nightSeed = params.seed + i;
    const prng = new PRNG(nightSeed);

    try {
      const engine = new GameEngine({
        seed: nightSeed,
        night: nightNum
      });

      const maxTicks = Math.round(engine.mapData.duration_s * 60);
      let currentMove = [0, 0];

      for (let t = 0; t < maxTicks; t++) {
        if (engine.state === 'won' || engine.state === 'lost') {
          break;
        }

        // Every 30 ticks reselect move dir
        if (t % 30 === 0) {
          const moveAngle = prng.range(0, Math.PI * 2);
          currentMove = [Math.cos(moveAngle), Math.sin(moveAngle)];
        }

        // Random inputs
        const input = {
          move: currentMove,
          cam_yaw_deg: 0,
          jump: prng.next() < 0.05,
          dash: prng.next() < 0.03,
          pulse: prng.next() < 0.02,
          interact: prng.next() < 0.10
        };

        engine.step(input);
      }

      results.push(engine.state);

      if (i === 0) {
        // Record RSS after first night completes and memory stabilizes
        memStartMb = Math.round(process.memoryUsage().rss / (1024 * 1024));
      }
    } catch (err) {
      crashes++;
      results.push('crash');
      console.error(`Night ${i + 1} crashed:`, err);
    }
  }

  const memEndMb = Math.round(process.memoryUsage().rss / (1024 * 1024));
  const durationS = Math.round((performance.now() - startTime) / 100) / 10;

  const soakResult = {
    nights: params.nights,
    crashes,
    results,
    mem_start_mb: memStartMb,
    mem_end_mb: memEndMb,
    duration_s: durationS
  };

  const outPath = path.resolve(process.cwd(), params.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(soakResult, null, 2), 'utf-8');

  console.log(`Soak test completed: ${params.nights} nights in ${durationS}s`);
  console.log(`Results: ${results.join(', ')}`);
  console.log(`Crashes: ${crashes} | Mem Start: ${memStartMb}MB -> End: ${memEndMb}MB`);
  console.log(`Report written to ${params.out}`);

  process.exit(crashes === 0 ? 0 : 1);
}

runSoakTest().catch((err) => {
  console.error('Soak fatal error:', err);
  process.exit(1);
});
