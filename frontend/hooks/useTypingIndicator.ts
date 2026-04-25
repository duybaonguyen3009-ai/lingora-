"use client";

/**
 * useTypingIndicator — PR9
 *
 * Outbound: debounced `typing_start` + idle `typing_stop` (3 s).
 * Inbound: listens for `typing` events targeting the active friend.
 *
 * Always emits `typing_stop` on cleanup (friend change, unmount, explicit
 * notifyStop) so a stale "đang gõ…" bubble never lingers on the other side.
 */

import { useEffect, useRef, useState } from "react";
import { useSocket } from "@/contexts/SocketContext";

const TYPING_IDLE_MS = 3000;
const FRIEND_TYPING_TIMEOUT_MS = 5000;

export interface UseTypingIndicatorResult {
  friendIsTyping: boolean;
  notifyTyping: () => void;
  notifyStop: () => void;
}

export function useTypingIndicator(friendId: string | null): UseTypingIndicatorResult {
  const { socket } = useSocket();
  const [friendIsTyping, setFriendIsTyping] = useState(false);
  const selfStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const friendStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Listen for friend typing events.
  useEffect(() => {
    if (!socket || !friendId) return;

    const handler = (payload: { userId?: string; typing?: boolean }) => {
      if (!payload || payload.userId !== friendId) return;
      const typing = !!payload.typing;
      setFriendIsTyping(typing);

      // Defensive timeout — if `typing_stop` never arrives we still clear the bubble.
      if (typing) {
        if (friendStopTimerRef.current) clearTimeout(friendStopTimerRef.current);
        friendStopTimerRef.current = setTimeout(
          () => setFriendIsTyping(false),
          FRIEND_TYPING_TIMEOUT_MS,
        );
      } else if (friendStopTimerRef.current) {
        clearTimeout(friendStopTimerRef.current);
        friendStopTimerRef.current = null;
      }
    };

    socket.on("typing", handler);
    return () => {
      socket.off("typing", handler);
      if (friendStopTimerRef.current) {
        clearTimeout(friendStopTimerRef.current);
        friendStopTimerRef.current = null;
      }
      setFriendIsTyping(false);
    };
  }, [socket, friendId]);

  const notifyTyping = () => {
    if (!socket || !friendId) return;
    socket.emit("typing_start", { receiverId: friendId });
    if (selfStopTimerRef.current) clearTimeout(selfStopTimerRef.current);
    selfStopTimerRef.current = setTimeout(() => {
      if (socket && friendId) socket.emit("typing_stop", { receiverId: friendId });
      selfStopTimerRef.current = null;
    }, TYPING_IDLE_MS);
  };

  const notifyStop = () => {
    if (selfStopTimerRef.current) {
      clearTimeout(selfStopTimerRef.current);
      selfStopTimerRef.current = null;
    }
    if (!socket || !friendId) return;
    socket.emit("typing_stop", { receiverId: friendId });
  };

  // Stop-emit on friend change / unmount — prevents a phantom bubble for the
  // previous friend while the user switches conversations mid-type.
  useEffect(() => {
    return () => {
      if (selfStopTimerRef.current) {
        clearTimeout(selfStopTimerRef.current);
        selfStopTimerRef.current = null;
      }
      if (socket && friendId) socket.emit("typing_stop", { receiverId: friendId });
    };
  }, [socket, friendId]);

  return { friendIsTyping, notifyTyping, notifyStop };
}
