import { useState, useEffect, useRef, useCallback } from "react";
import SimplePeer from "simple-peer";

export const useWebRTC = (lobbyId, userId, socket) => {
    const [streams, setStreams] = useState([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isDeafened, setIsDeafened] = useState(false);

    const localStreamRef = useRef(null);
    const peersRef = useRef({});

    const cleanup = useCallback(() => {
        Object.values(peersRef.current).forEach(peer => peer?.destroy());
        peersRef.current = {};

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop());
            localStreamRef.current = null;
        }

        setStreams([]);
    }, []);

    // 🎤 JOIN VOICE (MUST BE USER CLICK)
    const joinVoice = useCallback(async () => {
        if (localStreamRef.current) return true;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            localStreamRef.current = stream;
            stream.getAudioTracks()[0].enabled = true;
            setIsMuted(false);

            return true;
        } catch (err) {
            console.error("Mic error:", err);
            return false;
        }
    }, []);

    // 🔁 SIGNAL HANDLING
    useEffect(() => {
        if (!socket) return;

        const handleSignal = ({ senderId, signalData }) => {
            if (!localStreamRef.current) return;

            let peer = peersRef.current[senderId];
            if (!peer) {
                peer = createPeer(senderId, false);
                peersRef.current[senderId] = peer;
            }
            peer.signal(signalData);
        };

        socket.on("signal_voice", handleSignal);
        return () => socket.off("signal_voice", handleSignal);
    }, [socket]);

    // 👥 SYNC PEERS
    const syncPeers = useCallback((participants) => {
        if (!localStreamRef.current) return;

        participants.forEach(p => {
            const targetId = p.userId;
            if (targetId === userId) return;
            if (peersRef.current[targetId]) return;

            const initiator = userId > targetId;
            if (initiator) {
                peersRef.current[targetId] = createPeer(targetId, true);
            }
        });

        const ids = participants.map(p => p.userId);
        Object.keys(peersRef.current).forEach(id => {
            if (!ids.includes(id)) {
                peersRef.current[id].destroy();
                delete peersRef.current[id];
                setStreams(prev => prev.filter(s => s.peerId !== id));
            }
        });
    }, [userId]);

    function createPeer(targetId, initiator) {
        const peer = new SimplePeer({
            initiator,
            trickle: false,
            stream: localStreamRef.current,
            config: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] }
        });

        peer.on("signal", signal =>
            socket.emit("signal_voice", {
                senderId: userId,
                targetId,
                signalData: signal
            })
        );

        peer.on("stream", stream => {
            setStreams(prev =>
                prev.some(s => s.peerId === targetId)
                    ? prev
                    : [...prev, { peerId: targetId, stream }]
            );
        });

        peer.on("connect", () => console.log("Connected to", targetId));
        peer.on("error", err => console.error("Peer error:", err));

        return peer;
    }

    // 🔇 MUTE
    const toggleMute = () => {
        const track = localStreamRef.current?.getAudioTracks()[0];
        if (!track) return;
        track.enabled = !track.enabled;
        setIsMuted(!track.enabled);
    };

    // 🎧 DEAFEN
    const toggleDeafen = () => setIsDeafened(v => !v);

    return {
        joinVoice,
        cleanup,
        streams,
        isMuted,
        isDeafened,
        toggleMute,
        toggleDeafen,
        syncPeers
    };
};
