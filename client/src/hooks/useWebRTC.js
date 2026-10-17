import { useState, useEffect, useRef, useCallback } from "react";
import SimplePeer from "simple-peer";
import { apiGet } from "../api/client";
import { sendAction } from "../features/lobby/socket";

export function useWebRTC(lobbyId, userId, socket) {
  const [streams, setStreams] = useState([]);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [isMuted, setMuted] = useState(false);
  const [isDeafened, setDeafened] = useState(false);
  const local = useRef(null),
    peers = useRef(new Map()),
    members = useRef([]),
    ice = useRef([]),
    retries = useRef(new Map()),
    retryTimers = useRef(new Set()),
    createRef = useRef(null),
    mounted = useRef(true),
    generation = useRef(0),
    pending = useRef(false);
  const destroyPeers = useCallback(() => {
    for (const timer of retryTimers.current) clearTimeout(timer);
    retryTimers.current.clear();
    for (const peer of peers.current.values()) peer.destroy();
    peers.current.clear();
    setStreams([]);
  }, []);
  const cleanup = useCallback(() => {
    generation.current++;
    members.current = [];
    const stream = local.current;
    local.current = null;
    stream?.getTracks().forEach((track) => track.stop());
    destroyPeers();
    retries.current.clear();
    setActive(false);
    setMuted(false);
  }, [destroyPeers]);
  const makePeer = useCallback(
    (targetId, initiator) => {
      if (!local.current || !socket.connected) return null;
      const peer = new SimplePeer({
        initiator,
        trickle: true,
        stream: local.current,
        config: {
          iceServers: ice.current,
          iceTransportPolicy:
            import.meta.env.VITE_FORCE_TURN === "true" ? "relay" : "all",
        },
      });
      peers.current.set(targetId, peer);
      peer.on("signal", (signalData) =>
        sendAction(socket, "signal_voice", { targetId, signalData }).catch(
          (err) => {
            if (mounted.current) setError(err.message);
          },
        ),
      );
      peer.on("stream", (stream) => {
        if (mounted.current)
          setStreams((old) => [
            ...old.filter((item) => item.peerId !== targetId),
            { peerId: targetId, stream },
          ]);
      });
      peer.on("connect", () => {
        retries.current.delete(targetId);
        if (mounted.current) setError("");
      });
      const closed = () => {
        if (peers.current.get(targetId) !== peer) return;
        peers.current.delete(targetId);
        if (mounted.current)
          setStreams((old) => old.filter((item) => item.peerId !== targetId));
        if (
          local.current &&
          members.current.includes(targetId) &&
          socket.connected &&
          userId > targetId
        ) {
          const attempts = retries.current.get(targetId) || 0;
          if (attempts < 2) {
            retries.current.set(targetId, attempts + 1);
            const timer = setTimeout(() => {
              retryTimers.current.delete(timer);
              if (
                local.current &&
                members.current.includes(targetId) &&
                !peers.current.has(targetId)
              )
                createRef.current(targetId, true);
            }, 1000);
            retryTimers.current.add(timer);
          } else if (mounted.current)
            setError(
              "A voice connection failed. Leave voice and rejoin to retry.",
            );
        }
      };
      peer.on("error", () => {
        if (mounted.current)
          setError("Voice connection interrupted. Reconnecting…");
        peer.destroy();
      });
      peer.on("close", closed);
      return peer;
    },
    [socket, userId],
  );
  useEffect(() => {
    createRef.current = makePeer;
  }, [makePeer]);
  useEffect(() => {
    mounted.current = true;
    const updateMembers = (ids) => {
      members.current = ids;
      for (const [id, peer] of peers.current)
        if (!ids.includes(id)) {
          peers.current.delete(id);
          peer.destroy();
          setStreams((old) => old.filter((item) => item.peerId !== id));
        }
      if (!local.current) return;
      for (const id of ids)
        if (id !== userId && userId > id && !peers.current.has(id))
          makePeer(id, true);
    };
    const signal = ({ senderId, signalData }) => {
      if (!local.current || !members.current.includes(senderId)) return;
      let peer = peers.current.get(senderId);
      if (signalData.type === "offer" && peer) {
        peers.current.delete(senderId);
        peer.destroy();
        peer = null;
      }
      peer = peer || makePeer(senderId, false);
      try {
        peer?.signal(signalData);
      } catch {
        peer?.destroy();
      }
    };
    const resume = () => {
      if (local.current)
        sendAction(socket, "voice_join")
          .then((result) => updateMembers(result.members))
          .catch((err) => {
            setError(err.message);
            cleanup();
          });
    };
    const disconnect = () => {
      members.current = [];
      destroyPeers();
    };
    socket.on("voice_members", updateMembers);
    socket.on("signal_voice", signal);
    socket.on("lobby_joined", resume);
    socket.on("disconnect", disconnect);
    return () => {
      mounted.current = false;
      socket.off("voice_members", updateMembers);
      socket.off("signal_voice", signal);
      socket.off("lobby_joined", resume);
      socket.off("disconnect", disconnect);
      cleanup();
    };
  }, [socket, userId, lobbyId, makePeer, cleanup, destroyPeers]);
  const joinVoice = useCallback(async () => {
    if (local.current || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    const attempt = generation.current;
    let media;
    try {
      media = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (attempt !== generation.current || !mounted.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      const config = await apiGet(`/api/lobbies/${lobbyId}/ice`);
      if (attempt !== generation.current || !mounted.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      ice.current = config.iceServers;
      local.current = media;
      await sendAction(socket, "voice_join");
      if (attempt !== generation.current || !mounted.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      setActive(true);
      setMuted(false);
    } catch (err) {
      media?.getTracks().forEach((track) => track.stop());
      cleanup();
      if (mounted.current)
        setError(
          err.name === "NotAllowedError"
            ? "Microphone permission was denied. You can still use text chat."
            : err.message ||
                "Voice is unavailable. You can still use text chat.",
        );
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }, [lobbyId, socket, cleanup]);
  const leaveVoice = useCallback(async () => {
    try {
      if (socket.connected) await sendAction(socket, "voice_leave");
    } finally {
      cleanup();
    }
  }, [socket, cleanup]);
  const toggleMute = useCallback(() => {
    const track = local.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMuted(!track.enabled);
    }
  }, []);
  return {
    joinVoice,
    leaveVoice,
    cleanup,
    streams,
    active,
    busy,
    error,
    isMuted,
    isDeafened,
    toggleMute,
    toggleDeafen: () => setDeafened((old) => !old),
  };
}
