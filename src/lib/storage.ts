// localStorage with JSON and without throwing (private mode, blocked storage, quota).
const PREFIX = 'cc:'

export function load<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw === null ? undefined : (JSON.parse(raw) as T)
  } catch {
    return undefined
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Not fatal: the game works, it just can't survive a refresh.
  }
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    // ignore
  }
}

/** All keys the app uses, in one place. */
export const keys = {
  /** Full GameState on the host's device, per room. */
  hostGame: (roomCode: string) => `host:${roomCode}`,
  /** { playerId, name, hostId } on a guest's device, per room. */
  guest: (roomCode: string) => `guest:${roomCode}`,
  /** Last name typed, to prefill the next join or settings screen. */
  lastName: 'lastName',
  /** Last settings the host used. */
  lastSettings: 'lastSettings',
  /** Statement ids this device hosted recently, so new games avoid repeats. */
  recentStatements: 'recentStatements',
}
