import type { CultureCode } from './schema'
// Generated from the statements CSV by `npm run content` (runs before dev and build): each
// statement's `fits`, nothing else. The statements themselves stay on the Worker (/api/deck).
import data from './pool.json'

export const POOL_FITS = data as CultureCode[][]
