import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { useAuth } from "@/contexts/AuthContext";
import { createRealtimeSocket, RealtimeConnectionState } from "@/lib/realtimeSocket";

type CustomerRealtimeContextValue = {
  socket: Socket | null;
  connectionState: RealtimeConnectionState;
};

const CustomerRealtimeContext = createContext<CustomerRealtimeContextValue>({
  socket: null,
  connectionState: "disconnected",
});

export const CustomerRealtimeProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>("disconnected");

  useEffect(() => {
    if (!isAuthenticated) {
      setSocket(null);
      setConnectionState("disconnected");
      return;
    }
    const token = localStorage.getItem("userToken");
    if (!token) return;

    const nextSocket = createRealtimeSocket(token);
    socketRef.current = nextSocket;
    setSocket(nextSocket);
    setConnectionState("connecting");
    nextSocket.on("connect", () => setConnectionState("connected"));
    nextSocket.io.on("reconnect_attempt", () => setConnectionState("reconnecting"));
    nextSocket.on("disconnect", (reason) => setConnectionState(reason === "io client disconnect" ? "disconnected" : "reconnecting"));
    nextSocket.on("connect_error", () => setConnectionState("error"));
    nextSocket.on("booking:updated", (detail) => {
      window.dispatchEvent(new CustomEvent("wellcare:booking-updated", { detail }));
    });
    nextSocket.connect();

    return () => {
      nextSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnectionState("disconnected");
    };
  }, [isAuthenticated]);

  const value = useMemo(() => ({ socket, connectionState }), [socket, connectionState]);
  return <CustomerRealtimeContext.Provider value={value}>{children}</CustomerRealtimeContext.Provider>;
};

export const useCustomerRealtime = () => useContext(CustomerRealtimeContext);