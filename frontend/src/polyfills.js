import { Buffer } from 'buffer'
import process from 'process'
import * as util from 'util'

window.Buffer = Buffer
window.process = process
window.util = util

// Fix for simple-peer
if (!process.nextTick) {
  process.nextTick = setImmediate || ((fn) => setTimeout(fn, 0))
}