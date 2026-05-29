/**
 * Re-exports getIO from config/socket.js as getSocketIo
 * for backwards compatibility with queue workers/processors.
 */
export { getIO as getSocketIo } from '../config/socket.js';
