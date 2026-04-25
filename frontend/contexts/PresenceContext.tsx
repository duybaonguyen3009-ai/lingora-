"use client";

/**
 * PresenceContext — PR9
 *
 * Hydrates from `presence_sync` once per connect, then mutates via
 * `user_online` / `user_offline` events. Map resets when socket is null
 * (logout, reconnect gap) so stale dots don't linger.
 *
 * Consumers use `isOnline(userId)` — cheap Set lookup; no selector memoisation
 * needed since the Set reference only changes when the underlying status
 * actually changes.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useSocket } from "./SocketContext";

interface PresenceContextValue {
  onlineUserIds: Set<string>;
  isOnline: (userId: string | null | undefined) => boolean;
}

const PresenceContext = createContext<PresenceContextValue>({
  onlineUserIds: new Set(),
  isOnline: () => false,
});

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { socket } = useSocket();
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!socket) {
      setOnlineUserIds(new Set());
      return;
    }

    const handleSync = (payload: { online?: string[] }) => {
      if (Array.isArray(payload?.online)) setOnlineUserIds(new Set(payload.online));
    };
    const handleOnline = (payload: { userId?: string }) => {
      if (!payload?.userId) return;
      setOnlineUserIds((prev) => {
        if (prev.has(payload.userId!)) return prev;
        const next = new Set(prev);
        next.add(payload.userId!);
        return next;
      });
    };
    const handleOffline = (payload: { userId?: string }) => {
      if (!payload?.userId) return;
      setOnlineUserIds((prev) => {
        if (!prev.has(payload.userId!)) return prev;
        const next = new Set(prev);
        next.delete(payload.userId!);
        return next;
      });
    };

    socket.on("presence_sync", handleSync);
    socket.on("user_online", handleOnline);
    socket.on("user_offline", handleOffline);

    return () => {
      socket.off("presence_sync", handleSync);
      socket.off("user_online", handleOnline);
      socket.off("user_offline", handleOffline);
    };
  }, [socket]);

  const isOnline = (userId: string | null | undefined) =>
    !!userId && onlineUserIds.has(userId);

  return (
    <PresenceContext.Provider value={{ onlineUserIds, isOnline }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence(): PresenceContextValue {
  return useContext(PresenceContext);
}
