import { Server } from "socket.io";
import { updatePlayerMovement, removePlayer } from "./gameManager.js";

let io;

export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    socket.on("join_session", (payload) => {
      if (!payload || !payload.sessionId) return;
      const room = `session_${payload.sessionId}`;
      socket.join(room);

      socket.data = {
        ...payload,
        room,
      };
      console.log(`[Socket] ${payload.displayName} joined ${room}`);
    });

    socket.on("player_update", (data) => {
      if (!socket.data || !socket.data.room) return;

      if (
        typeof data.x !== "number" ||
        typeof data.y !== "number" ||
        !isFinite(data.x) ||
        !isFinite(data.y) ||
        typeof data.floorId !== "string" ||
        typeof data.direction !== "string" ||
        typeof data.alive !== "boolean"
      ) {
        return;
      }

      updatePlayerMovement(
        socket.data.sessionId,
        socket.data.participantId,
        socket.data.studentId,
        socket.data.displayName,
        data,
      );

      socket.to(socket.data.room).emit("remote_player_update", {
        participantId: socket.data.participantId,
        studentId: socket.data.studentId,
        displayName: socket.data.displayName,
        state: data,
      });
    });

    socket.on("door_event", (data) => {
      if (!socket.data || !socket.data.room) return;
      if (typeof data.doorId !== "string" || typeof data.state !== "string")
        return;

      socket.to(socket.data.room).emit("door_state_update", {
        doorId: data.doorId,
        state: data.state,
      });
    });

    socket.on("disconnect", () => {
      if (socket.data && socket.data.room) {
        removePlayer(socket.data.sessionId, socket.data.participantId);
        socket.to(socket.data.room).emit("remote_player_disconnect", {
          participantId: socket.data.participantId,
        });
      }
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
}
