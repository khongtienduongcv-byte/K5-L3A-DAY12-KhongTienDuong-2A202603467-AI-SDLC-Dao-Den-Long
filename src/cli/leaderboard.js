#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { sanitizeName, sortAndLimitEntries } from '../core/leaderboard.js';

const LEADERBOARD_FILE = path.resolve(process.cwd(), 'leaderboard.json');

export function loadFileLeaderboard(filePath = LEADERBOARD_FILE) {
  try {
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (Array.isArray(data.entries)) {
        return sortAndLimitEntries(data.entries);
      }
    }
  } catch {
    // fallback
  }
  return [];
}

export function saveFileLeaderboard(entries, filePath = LEADERBOARD_FILE) {
  const top10 = sortAndLimitEntries(entries);
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({ entries: top10 }, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save leaderboard:', err);
  }
  return top10;
}

export function addFileEntry(entry, filePath = LEADERBOARD_FILE) {
  const entries = loadFileLeaderboard(filePath);
  entries.push({
    name: sanitizeName(entry.name),
    score: parseInt(entry.score, 10) || 0,
    nights_won: Math.max(0, Math.min(3, parseInt(entry.nights_won, 10) || 0)),
    achieved_at: entry.achieved_at || new Date().toISOString(),
    seed: entry.seed ?? 42
  });
  return saveFileLeaderboard(entries, filePath);
}

function run() {
  const args = process.argv.slice(2);
  let outFile = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if ((arg === '--export-leaderboard' || arg === '--export' || arg === '-o') && i + 1 < args.length) {
      outFile = args[++i];
    }
  }

  let entries = loadFileLeaderboard();

  // If empty, initialize with default high score samples
  if (entries.length === 0) {
    entries = [
      {
        name: 'May_Keeper',
        score: 1850,
        nights_won: 3,
        achieved_at: '2026-11-20T16:00:00.000Z',
        seed: 42
      },
      {
        name: 'Lantern_Pro',
        score: 1420,
        nights_won: 2,
        achieved_at: '2026-11-20T16:05:00.000Z',
        seed: 7
      },
      {
        name: 'Giot_Lua',
        score: 980,
        nights_won: 1,
        achieved_at: '2026-11-20T16:10:00.000Z',
        seed: 101
      }
    ];
    saveFileLeaderboard(entries);
  }

  const result = { entries: sortAndLimitEntries(entries) };
  const jsonStr = JSON.stringify(result, null, 2);

  if (outFile) {
    const outPath = path.resolve(process.cwd(), outFile);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, jsonStr, 'utf-8');
    console.log(`Leaderboard exported to ${outFile}`);
  } else {
    process.stdout.write(jsonStr + '\n');
  }

  process.exit(0);
}

if (process.argv[1] && process.argv[1].endsWith('leaderboard.js')) {
  run();
}
