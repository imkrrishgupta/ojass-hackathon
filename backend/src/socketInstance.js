let io;

export const setIO = (ioInstance) => {
  io = ioInstance;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized! Call setIO(io) first.");
  }
  return io;
};
