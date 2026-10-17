import { io } from "socket.io-client";
import { apiPost, SOCKET_BASE_URL } from "../../api/client";

export function createLobbySocket() {
  const socket = io(SOCKET_BASE_URL, {
    autoConnect: false,
    withCredentials: false,
    timeout: 120000,
    reconnectionAttempts: Infinity,
    reconnectionDelayMax: 10000,
    auth: (callback) => {
      apiPost("/api/auth/socket-ticket")
        .then(({ ticket }) => {
          socket.ticketError = "";
          callback({ ticket });
        })
        .catch((err) => {
          socket.ticketError = err.message;
          callback({});
        });
    },
  });
  return socket;
}

export async function sendAction(socket, event, payload = {}) {
  if (!socket?.connected)
    throw new Error("You are reconnecting. Please try again when connected.");
  const result = await socket.timeout(8000).emitWithAck(event, payload);
  if (!result?.ok) {
    const error = new Error(
      result?.error?.message ||
        "The action could not be completed. Please retry.",
    );
    error.code = result?.error?.code;
    throw error;
  }
  return result;
}
