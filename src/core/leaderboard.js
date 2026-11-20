// Pure Leaderboard management logic (Dual-environment: Web localStorage & Node.js memory/storage)

export function sanitizeName(rawName) {
  if (!rawName) return 'May_Keeper';
  // Allow letters, numbers, underscore, 3-12 chars
  const sanitized = String(rawName).replace(/[^A-Za-z0-9_]/g, '');
  if (sanitized.length < 3) return (sanitized + '___').slice(0, 3);
  return sanitized.slice(0, 12);
}

export function sortAndLimitEntries(entries, limit = 10) {
  if (!Array.isArray(entries)) return [];
  const copy = [...entries];
  copy.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return new Date(a.achieved_at).getTime() - new Date(b.achieved_at).getTime();
  });
  return copy.slice(0, limit);
}

const STORAGE_KEY = 'dao_den_long_leaderboard';

export function getBrowserLeaderboard() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data.entries)) {
        return sortAndLimitEntries(data.entries);
      }
    }
  } catch {
    // fallback
  }
  return [];
}

export function saveBrowserLeaderboard(entries) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    const top10 = sortAndLimitEntries(entries);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries: top10 }));
  } catch {
    // fallback
  }
}

export function addEntryToBrowser(entry) {
  const current = getBrowserLeaderboard();
  const newEntry = {
    name: sanitizeName(entry.name),
    score: parseInt(entry.score, 10) || 0,
    nights_won: Math.max(0, Math.min(3, parseInt(entry.nights_won, 10) || 0)),
    achieved_at: entry.achieved_at || new Date().toISOString(),
    seed: entry.seed ?? 42
  };
  current.push(newEntry);
  const updated = sortAndLimitEntries(current);
  saveBrowserLeaderboard(updated);
  return updated;
}
