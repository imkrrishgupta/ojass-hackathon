let io;

// Map userId → Set of socketIds (a user can have multiple tabs)
const userSockets = new Map();

export const setIO = (ioInstance) => {
  io = ioInstance;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized! Call setIO(io) first.");
  }
  return io;
};

export const registerUserSocket = (userId, socketId) => {
  if (!userId || !socketId) return;
  const key = String(userId);
  if (!userSockets.has(key)) userSockets.set(key, new Set());
  userSockets.get(key).add(socketId);
};

export const removeUserSocket = (socketId) => {
  for (const [userId, sockets] of userSockets.entries()) {
    sockets.delete(socketId);
    if (sockets.size === 0) userSockets.delete(userId);
  }
};

/**
 * Join all sockets of a given userId to a socket.io room.
 * Used by controllers to auto-join creator/responder to incident chat.
 */
export const joinUserToRoom = (userId, room) => {
  if (!io || !userId) return;
  const key = String(userId);
  const sockets = userSockets.get(key);
  if (!sockets) return;
  for (const sid of sockets) {
    const s = io.sockets.sockets.get(sid);
    if (s) s.join(room);
  }
};
