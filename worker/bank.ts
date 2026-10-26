// The statement bank, bundled into the Worker and never served as a file.
// Generated from the statements CSV by `npm run content` (dev and build run it).
import type { Statement } from '../src/content/schema'
import data from './statements.json'

export const BANK = data as Statement[]
