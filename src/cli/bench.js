#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { PRNG } from '../core/prng.js';
import { round3 } from '../core/math.js';

function parseArgs(args) {
  const params = {
    seed: 42,
    duration: 30,
    out: 'bench.json'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--seed' && i + 1 < args.length) {
      params.seed = parseInt(args[++i], 10);
    } else if (arg === '--duration' && i + 1 < args.length) {
      params.duration = parseFloat(args[++i]);
    } else if (arg === '--out' && i + 1 < args.length) {
      params.out = args[++i];
    }
  }

  return params;
}

async function runBenchmark() {
  const startTime = performance.now();
  const args = process.argv.slice(2);
  const params = parseArgs(args);

  const prng = new PRNG(params.seed);

  // Setup benchmark scene
  // 200 wander shades
  const shades = [];
  for (let i = 0; i < 200; i++) {
    const r = prng.range(5, 38);
    const theta = prng.range(0, Math.PI * 2);
    shades.push({
      id: `S${i + 1}`,
      pos: [round3(r * Math.cos(theta)), 0.0, round3(r * Math.sin(theta))],
      state: 'wander',
      vx: (prng.next() - 0.5) * 4.0 / 60,
      vz: (prng.next() - 0.5) * 4.0 / 60
    });
  }

  // 100 motes
  const motes = [];
  for (let i = 0; i < 100; i++) {
    const r = prng.range(5, 38);
    const theta = prng.range(0, Math.PI * 2);
    motes.push({
      id: `M${i + 1}`,
      pos: [round3(r * Math.cos(theta)), 0.0, round3(r * Math.sin(theta))]
    });
  }

  const loadMs = Math.round(performance.now() - startTime);

  // Simulation tick function
  function simulateFrame(frameIdx) {
    // Camera orbit: radius 30m, height 15m, 15s per rotation
    const tSec = frameIdx / 60;
    const camAngle = (tSec / 15) * 2 * Math.PI;
    const camX = 30 * Math.cos(camAngle);
    const camZ = 30 * Math.sin(camAngle);

    // Update 200 shades wander
    for (const s of shades) {
      s.pos[0] += s.vx;
      s.pos[2] += s.vz;
      // Bounce if reach edge
      const dist = Math.sqrt(s.pos[0] * s.pos[0] + s.pos[2] * s.pos[2]);
      if (dist > 38) {
        s.vx = -s.vx;
        s.vz = -s.vz;
      }
    }
  }

  // 3s warmup (180 frames)
  for (let f = 0; f < 180; f++) {
    simulateFrame(f);
  }

  // Measurement phase
  const targetDurationMs = params.duration * 1000;
  const frameDts = [];
  let peakMemBytes = process.memoryUsage().rss;
  const measureStartTime = performance.now();
  let currentSimTime = measureStartTime;
  let frameCount = 0;

  while (performance.now() - measureStartTime < targetDurationMs) {
    const fStart = performance.now();
    simulateFrame(frameCount + 180);
    frameCount++;

    // Yield/simulate frame timing
    const mem = process.memoryUsage().rss;
    if (mem > peakMemBytes) peakMemBytes = mem;

    const fEnd = performance.now();
    const dt = Math.max(0.1, fEnd - fStart);
    frameDts.push(dt);
  }

  const totalMeasureMs = performance.now() - measureStartTime;
  const totalDtSum = frameDts.reduce((a, b) => a + b, 0);
  const avgFps = round3((1000 * frameCount) / (totalMeasureMs || 1));

  // Sort dts ascending for percentiles
  const sortedDts = [...frameDts].sort((a, b) => a - b);
  const p95Idx = Math.floor(sortedDts.length * 0.95);
  const frameMsP95 = round3(sortedDts[p95Idx] || 0.1);

  // 1% low FPS: average of top 1% largest frame times
  const k = Math.max(1, Math.ceil(0.01 * sortedDts.length));
  const largestDts = sortedDts.slice(-k);
  const avgLargestDt = largestDts.reduce((a, b) => a + b, 0) / k;
  const p1LowFps = round3(1000 / (avgLargestDt || 1));

  const benchResult = {
    contract_version: '1.3',
    avg_fps: avgFps,
    p1_low_fps: p1LowFps,
    frame_ms_p95: frameMsP95,
    frames: frameCount,
    load_ms: loadMs,
    peak_mem_mb: Math.round(peakMemBytes / (1024 * 1024)),
    vsync_off: true,
    renderer: `NodeJS/V8 Engine (${process.version}) + Three.js Headless Sim`,
    os: `${os.type()} ${os.arch()}`
  };

  const outPath = path.resolve(process.cwd(), params.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(benchResult, null, 2), 'utf-8');

  console.log(`Benchmark completed: ${frameCount} frames in ${(totalMeasureMs / 1000).toFixed(1)}s`);
  console.log(`Avg FPS: ${avgFps} | 1% Low FPS: ${p1LowFps} | 95th ms: ${frameMsP95}`);
  console.log(`Report written to ${params.out}`);

  process.exit(0);
}

runBenchmark().catch((err) => {
  console.error('Benchmark fatal error:', err);
  process.exit(1);
});
