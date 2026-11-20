#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { GameEngine } from '../core/engine.js';
import { DEFAULT_TUNING } from '../core/constants.js';

function loadTuning(contractPath = null) {
  try {
    const filePath = contractPath || path.resolve(process.cwd(), 'game.contract.json');
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (data && data.tuning) {
        return {
          ...DEFAULT_TUNING,
          ...data.tuning,
          score: {
            ...DEFAULT_TUNING.score,
            ...(data.tuning.score || {})
          }
        };
      }
    }
  } catch {
    // fallback
  }
  return DEFAULT_TUNING;
}

function parseArgs(args) {
  const params = {
    seed: 42,
    night: 1,
    scenario: null,
    inputs: null,
    ticks: 600,
    out: null,
    snapshotEvery: 10
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--seed' && i + 1 < args.length) {
      params.seed = parseInt(args[++i], 10);
    } else if (arg === '--night' && i + 1 < args.length) {
      params.night = parseInt(args[++i], 10);
    } else if (arg === '--scenario' && i + 1 < args.length) {
      params.scenario = args[++i];
    } else if (arg === '--inputs' && i + 1 < args.length) {
      params.inputs = args[++i];
    } else if (arg === '--ticks' && i + 1 < args.length) {
      params.ticks = parseInt(args[++i], 10);
    } else if (arg === '--out' && i + 1 < args.length) {
      params.out = args[++i];
    } else if (arg === '--snapshot-every' && i + 1 < args.length) {
      params.snapshotEvery = parseInt(args[++i], 10);
    }
  }

  return params;
}

function loadJsonFile(filePath) {
  if (!filePath) return null;
  try {
    const content = fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error parsing JSON file ${filePath}:`, err.message);
    process.exit(2);
  }
}

async function run() {
  const args = process.argv.slice(2);
  const params = parseArgs(args);

  const scenarioData = loadJsonFile(params.scenario);
  const inputsData = loadJsonFile(params.inputs);

  const tuning = loadTuning();

  const engine = new GameEngine({
    seed: params.seed,
    tuning,
    scenario: scenarioData
  });

  // Prepare inputs mapping
  // frames: [{ tick: 0, move: [x, z], cam_yaw_deg: theta, interact: bool, pulse: bool }, ...]
  const inputFrames = inputsData?.frames || [];
  let currentInput = {
    move: [0, 0],
    cam_yaw_deg: 0,
    interact: false,
    pulse: false
  };

  let frameIdx = 0;

  const outputLines = [];

  // Snapshot at tick 0
  outputLines.push(JSON.stringify(engine.getSnapshot()));

  // Simulation loop
  const totalTicks = params.ticks;
  for (let t = 0; t < totalTicks; t++) {
    if (engine.state !== 'playing') {
      break;
    }

    // Update input frame if match current tick
    while (frameIdx < inputFrames.length && inputFrames[frameIdx].tick === t) {
      const frame = inputFrames[frameIdx];
      if (frame.move !== undefined) currentInput.move = frame.move;
      if (frame.cam_yaw_deg !== undefined) currentInput.cam_yaw_deg = frame.cam_yaw_deg;
      if (frame.interact !== undefined) currentInput.interact = frame.interact;
      if (frame.pulse !== undefined) currentInput.pulse = frame.pulse;
      frameIdx++;
    }

    // Step simulation
    const events = engine.step(currentInput);

    // Record events
    for (const evt of events) {
      outputLines.push(JSON.stringify(evt));
    }

    // Record snapshot every snapshotEvery ticks
    if (engine.tick % params.snapshotEvery === 0) {
      outputLines.push(JSON.stringify(engine.getSnapshot()));
    }
  }

  // End record
  outputLines.push(JSON.stringify(engine.getEnd()));

  // Output JSONL
  const jsonlContent = outputLines.join('\n') + '\n';
  if (params.out) {
    const outPath = path.resolve(process.cwd(), params.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, jsonlContent, 'utf-8');
  } else {
    process.stdout.write(jsonlContent);
  }

  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal engine error:', err);
  process.exit(1);
});
