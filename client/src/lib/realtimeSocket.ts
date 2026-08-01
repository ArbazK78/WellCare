import { io, Socket } from "socket.io-client";

export type RealtimeConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting" | "error";

const realtimeUrl = () => import.meta.env.VITE_SOCKET_URL || window.location.origin;

export const createRealtimeSocket = (token: string): Socket => io(realtimeUrl(), {
  auth: { token },
  autoConnect: false,
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 8000,
  timeout: 10000,
});