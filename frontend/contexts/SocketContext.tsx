"use client";

/**
 * SocketContext — PR9
 *
 * Owns the single socket.io client for the whole (app) group. Re-initialises
 * when the authenticated user OR the access token changes (token refresh
 * must reconnect with the new JWT). Clean-up on unmount / logout disconnects
 * the socket so the server fires `user_offline` for the last device.
 *
 * Consumed by PresenceContext (presence_sync / user_online / user_offline),
 * useTypingIndicator (typing events), and ChatTab (new_message,
 * message_delivered, messages_seen).
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "@/lib/stores/authStore";

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
});

function resolveSocketUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (fromEnv) return fromEnv;
  // In dev (Next.js proxy + same origin) or when the env is unset, use the
  // current origin so cookie-auth and CORS behave identically to REST.
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export function SocketProvider({ children }: { children: ReactNode }) {
  // Primitive selectors keep re-render count low (avoid subscribing to whole user object).
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!userId || !accessToken) {
      setSocket(null);
      setConnected(false);
      return;
    }

    const url = resolveSocketUrl();
    const s = io(url, {
      auth: { token: accessToken },
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      // Silent auth failures — polling fallback still covers message delivery.
      timeout: 10000,
    });

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onError = () => { /* silent — polling fallback */ };

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("connect_error", onError);

    setSocket(s);

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("connect_error", onError);
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [userId, accessToken]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}
