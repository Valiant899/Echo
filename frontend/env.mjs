// env.mjs (in project root)
import { Buffer } from 'buffer';

// Make Buffer available globally
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
}

export default {
  // Your environment variables
};