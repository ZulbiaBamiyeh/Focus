// Persistence: localStorage when it works, memory when it doesn't (private
// windows, blocked site data). Same shape either way.
//
// The key is deliberately not the classic app's `ember:v4`: both pages share
// an origin, and neither should read the other's state.

const KEY = 'isle:v1';
const mem = new Map<string, string>();

function ls(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}

export function load<T>(): Partial<T> | null {
  try {
    const raw = ls()?.getItem(KEY) ?? mem.get(KEY);
    return raw ? (JSON.parse(raw) as Partial<T>) : null;
  } catch { return null; }
}

export function save(data: unknown) {
  const raw = JSON.stringify(data);
  try {
    const s = ls();
    if (s) s.setItem(KEY, raw); else mem.set(KEY, raw);
  } catch { mem.set(KEY, raw); }
}
