import prisma from "../db/config.js";
import * as lobbyService from "../services/lobby.service.js";

export const lobbyHandler = (io, socket) => {
  // JOIN LOBBY
  socket.on("join_lobby", async ({ lobbyId, userId }) => {
    try {
      const lobby = await prisma.lobby.findUnique({
        where: { id: lobbyId },
        include: { participants: true },
      });

      if (!lobby) {
        socket.emit("error", { message: "Lobby not found" });
        return;
      }

      const isParticipant = lobby.participants.some((p) => p.userId === userId);
      const isFull = lobby.participants.length >= lobby.maxPlayers;

      if (!isParticipant && isFull) {
        socket.emit("error", { message: "Lobby is full" });
        return;
      }

      // Add to DB if not present
      if (!isParticipant) {
        await prisma.lobbyParticipant.create({
          data: {
            userId,
            lobbyId,
          },
        });
      }

      // Socket Join
      socket.join(`lobby_${lobbyId}`);

      // Remove user from previous socket instances (for reconnects)
      const sockets = await io.in(`user_${userId}`).fetchSockets();
      sockets.forEach((s) => {
        if (s.id !== socket.id) {
          s.leave(`user_${userId}`);
        }
      });

      socket.join(`user_${userId}`); // Join user-specific room for WebRTC signaling
      socket.data.userId = userId;
      socket.data.lobbyId = lobbyId;

      // Fetch freshly updated lobby state
      const updatedLobby = await lobbyService.getLobbyById(lobbyId);

      // Broadcast update
      io.to(`lobby_${lobbyId}`).emit("lobby_updated", updatedLobby);

      // System message? maybe later
    } catch (error) {
      console.error("Join Lobby Error:", error);
      socket.emit("error", { message: "Failed to join lobby" });
    }
  });

  // LEAVE LOBBY
  socket.on("leave_lobby", async () => {
    const { lobbyId, userId } = socket.data;
    if (!lobbyId || !userId) return;

    try {
      await prisma.lobbyParticipant.deleteMany({
        where: {
          lobbyId,
          userId,
        },
      });

      socket.leave(`lobby_${lobbyId}`);

      const updatedLobby = await lobbyService.getLobbyById(lobbyId);
      io.to(`lobby_${lobbyId}`).emit("lobby_updated", updatedLobby);
    } catch (error) {
      console.error("Leave Lobby Error:", error);
    }
  });

  // SEND MESSAGE
  socket.on("send_message", async ({ message, user }) => {
    const { lobbyId } = socket.data;
    if (!lobbyId) return;

    // Just emit to room for now (persistence later/if needed)
    io.to(`lobby_${lobbyId}`).emit("new_message", {
      id: Date.now().toString(), // temp ID
      text: message,
      user: user, // { id, username, avatar }
      timestamp: new Date().toISOString(),
    });
  });

  // TOGGLE READY
  socket.on("toggle_ready", async () => {
    const { lobbyId, userId } = socket.data;
    if (!lobbyId || !userId) return;

    try {
      // 1. Get current status
      const participant = await prisma.lobbyParticipant.findUnique({
        where: {
          userId_lobbyId: { userId, lobbyId },
        },
      });

      if (!participant) return;

      // 2. Flip it
      await prisma.lobbyParticipant.update({
        where: { userId_lobbyId: { userId, lobbyId } },
        data: { isReady: !participant.isReady },
      });

      // 3. Broadcast
      const updatedLobby = await lobbyService.getLobbyById(lobbyId);
      io.to(`lobby_${lobbyId}`).emit("lobby_updated", updatedLobby);
    } catch (error) {
      console.error("Toggle Ready Error:", error);
    }
  });

  // KICK PLAYER
  socket.on("kick_player", async ({ targetUserId }) => {
    const { lobbyId, userId } = socket.data; // Requesting user (Host)
    if (!lobbyId || !userId) return;

    try {
      // Verify requester is host
      const lobby = await prisma.lobby.findUnique({
        where: { id: lobbyId },
      });

      if (lobby.hostId !== userId) {
        socket.emit("error", { message: "Only host can kick players" });
        return;
      }

      // Remove target from DB
      await prisma.lobbyParticipant.deleteMany({
        where: { lobbyId, userId: targetUserId },
      });

      // Emit specific kick event so client can redirect
      // We need to find the socket ID of the target user...
      // For simple implementation, we emit to the room "player_kicked" with target ID
      // Clients check if it matches them
      io.to(`lobby_${lobbyId}`).emit("player_kicked", { userId: targetUserId });

      // Broadcast update
      const updatedLobby = await lobbyService.getLobbyById(lobbyId);
      io.to(`lobby_${lobbyId}`).emit("lobby_updated", updatedLobby);
    } catch (error) {
      console.error("Kick Player Error:", error);
    }
  });

  // Disconnect
  socket.on("disconnect", async () => {
    // similar logic to leave_lobby?
    // User might just refresh page. Let's not auto-leave on disconnect for now to allow reconnects?
    // Or maybe we do want to show them as offline?
    // For MVP, if they disconnect, we don't remove them immediately from DB.
    // But 'leave_lobby' event is explicit user action to exit.
  });

  // UPDATE CREDENTIALS
  socket.on("update_credentials", async ({ credentials }) => {
    const { lobbyId, userId } = socket.data;
    if (!lobbyId || !userId) return;

    try {
      const lobby = await prisma.lobby.findUnique({ where: { id: lobbyId } });
      if (!lobby) return;

      if (lobby.hostId !== userId) {
        socket.emit("error", { message: "Only host can update credentials" });
        return;
      }

      await prisma.lobby.update({
        where: { id: lobbyId },
        data: { credentials },
      });

      const updatedLobby = await lobbyService.getLobbyById(lobbyId);
      io.to(`lobby_${lobbyId}`).emit("lobby_updated", updatedLobby);
    } catch (error) {
      console.error("Update Credentials Error:", error);
      socket.emit("error", { message: "Failed to update credentials" });
    }
  });

  // VOICE SIGNALING (P2P)
  socket.on("signal_voice", ({ targetId, signalData, senderId }) => {
    // Emit to user-based room instead of socket ID
    io.to(`user_${targetId}`).emit("signal_voice", {
      signalData,
      senderId,
    });
  });
};
